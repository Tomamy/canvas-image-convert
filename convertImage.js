function ConvertImage(opts){
	var defaults = {
		image: opts.image,
		width: opts.width,
		height: opts.height
	}
	for(var opt in opts){
		opts[opt] = defaults[opt];
	}
	this.opts = opts;
	this.image = this.opts && this.opts.image;
	this.ctx = null;
	this.canvas = this.createCanvas();  
}

ConvertImage.prototype.createCanvas = function(){
	var canvas = document.createElement("canvas");
	canvas.height =	this.opts.height; 
	canvas.width = this.opts.width;

	return canvas;
}
ConvertImage.prototype.drawImage = function(){
	this.ctx = this.ctx || this.canvas.getContext("2d");
	this.ctx.clearRect(0,0,this.opts.width,this.opts.height);
	this.ctx.drawImage(this.image,0,0);
	return this;
}
/**
	@params x x is the current x axis
	@params y y is the current y axis
	@params radius
	if radius==1 ,the adjacency matrix is 3x3;if radius==2,the adjacency matrix is 5x5;
	@params pixels pixels is imagedata
**/
ConvertImage.prototype.getAdjacencyMatrix = function(x,y,radius,pixels){
	this.ajcMatrix = [];
	for(var i=y-radius;i<=y+radius;i++){
		for(var j=x-radius;j<=x+radius;j++){
			if(i<0 || j<0 || i>=this.opts.height || j>=this.opts.width){
				this.ajcMatrix.push("");
				continue;
			}
			var pos = (i*this.opts.width + j)*4;
			var pixel = {};
			pixel.r = pixels[pos].r;
			pixel.g = pixels[pos+1].g;
			pixel.b = pixels[pos+2].b;
			pixel.a = pixels[pos+3].a;
			this.ajcMatrix.push(pixel);
		}
	}
}
ConvertImage.prototype.getRGBA = function(x,y,pixels){
	var pos = (y*this.opts.width + x)*4;
	return {
		r: pixels[pos],
		g: pixels[pos+1],
		b: pixels[pos+2],
		a: pixels[pos+3]	
	}
}
ConvertImage.prototype.setRGBA = function(x,y,pixel,pixels){
	var pos = (y*this.opts.width + x)*4;
	pixels[pos] = pixel.r;
	pixels[pos+1] = pixel.g;
	pixels[pos+2] = pixel.b;
	return this;
}
/*
	nevatives 底片
	算法原理：将当前像素点的RGB值分别与255之差后的值作为当前点的RGB值，即
	R = 255 – R；G = 255 – G；B = 255 – B；
*/
ConvertImage.prototype.getNevatives = function(){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			var pixel = this.getRGBA(x,y,pixels);
			pixel.r = 255 - pixel.r;
			pixel.g = 255 - pixel.g;
			pixel.b = 255 - pixel.b;
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}
/**
	黑白	
	灰度处理一般有三种算法：
	1 最大值法：即新的颜色值R＝G＝B＝Max(R，G，B)，这种方法处理后的图片看起来亮度值偏高。
	2 平均值法：即新的颜色值R＝G＝B＝(R＋G＋B)／3，这样处理的图片十分柔和
	3 加权平均值法：即新的颜色值R＝G＝B＝(R ＊ Wr＋G＊Wg＋B＊Wb)，一般由于人眼对不同颜色的敏感度不一样，所以三种颜色值的权重不一样，一般来说绿色最高，红色其次，蓝色最低，最合理的取值分别为Wr ＝ 30％，Wg ＝ 59％，Wb ＝ 11％

	@params algorithm has values:
		1=>"maximum"
		2=>"average"
		3=>"weighted-average"
**/
ConvertImage.prototype.getBlackWhite = function(algorithm){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			var pixel = this.getRGBA(x,y,pixels);
			var retpix = "";
			switch (algorithm){
				case "average":
					retpix = (pixel.r+pixel.g+pixel.b)/3;
					break;
				case "maximum":
					retpix = pixel.r > pixel.g ? pixel.r : pixel.g;
					retpix = retpix > pixel.b ? retpix : pixel.b;
					break;
				case "weighted-average":
					retpix = pixel.r*0.3 + pixel.g*0.59 + pixel.b*0.11;
					break;
				default:
					retpix = pixel.r*0.3 + pixel.g*0.59 + pixel.b*0.11;
					break;
			}
			pixel.r = pixel.g = pixel.b = retpix;
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}
/**
	relief(浮雕)
	算法：
	对图像像素点的像素值分别与相邻像素点的像素值相减后加上128, 然后将其作为新的像素点的值.
**/
ConvertImage.prototype.getRelief = function(radius){
	this.drawImage();
	var imageData = this.ctx.getImageData(0,0,this.opts.width,this.opts.height);
	var pixels = imageData.data;	
	for(var y=0;y<this.opts.height;y++){
		for(var x=0;x<this.opts.width;x++){
			this.getAdjacencyMatrix(x,y,radius,pixels);
			var r=g=b=0;
			var pixel = "";
			for(var i=0;i<this.ajcMatrix.length;i++){
				if(!this.ajcMatrix){
					continue;
				}
				if(i==(this.ajcMatrix.length-1)/2+1){
					pixel = this.ajcMatrix[i];
				}
				r += this.ajcMatrix[i].r;
				g += this.ajcMatrix[i].g;
				b += this.ajcMatrix[i].b;
			}
			pixel.r = pixel.r - r + 128;
			pixel.g = pixel.g - g + 128;
			pixel.b = pixel.b - b + 128;
			//pixel.r=pixel.g=pixel.b = pixel.r*0.3 + pixel.g*0.59 + pixel.b*0.11;
			this.setRGBA(x,y,pixel,pixels);
		}
	}
	this.ctx.putImageData(imageData,0,0);
	var base64data = this.canvas.toDataURL();
	return base64data;
}


