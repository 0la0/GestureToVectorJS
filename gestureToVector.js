function GestureToVector(gesture){
	//--instance variables--//
	this.gesture = gesture;
	this.pointList;
	this.checkSubDiv = [];
	this.vectors = [];
	this.angles = [];
	this.distanceThresh = 10;
	this.angleThresh = 10;

	//--process gesture--//
	this.subDivide();
	this.granularCheck();
	this.addMidpoints();
	this.granularCheck();
	this.calcVectors();
	this.calcAngles();
	while (this.angleCheck()){
		this.vectors = [];
		this.angles = [];
		this.calcVectors();
		this.calcAngles();
	}
}

//Initial wrapper for the recursive 'findSubDiv' function
GestureToVector.prototype.subDivide = function(){
	var start = {
		x: this.gesture[0].x,
		y: this.gesture[0].y
	};
	var end = {
		x: this.gesture[gesture.length - 1].x,
		y: this.gesture[gesture.length - 1].y
	};
	//set initial control points as end points
	this.pointList = [0, this.gesture.length - 1];
	this.findSubDiv(this.pointList[0], this.pointList[1]);
}

//Find the local min and max of a given subdivision.
GestureToVector.prototype.findSubDiv = function(startIndex, endIndex){
	var indexString = startIndex + '' + endIndex;
	//if points have already been checked, get out
	//otherwise put points in array
	if (this.checkSubDiv.indexOf(indexString) != -1){
		return;
	} else {
		this.checkSubDiv.push(indexString);
	}
	//create local control points array
	//and objects to store absolute min and max
	var controlPoints = [];
	var absMin = {
		xIndex:	startIndex,
		yIndex:	startIndex,
		xVal: 	gesture[startIndex].x,
		yVal: 	gesture[startIndex].y
	};
	var absMax = {
		xIndex:	endIndex,
		yIndex:	endIndex,
		xVal: 	gesture[endIndex].x,
		yVal: 	gesture[endIndex].y
	};

	//find min/max
	for (var i = startIndex; i <= endIndex; i++){
		//find max: x
		if (this.gesture[i].x > absMax.xVal){
			absMax.xVal = gesture[i].x;
			absMax.xIndex = i;
		}
		//find max: y
		if (this.gesture[i].y > absMax.yVal){
			absMax.yVal = gesture[i].y;
			absMax.yIndex = i;
		}
		//find min: x
		if (this.gesture[i].x < absMin.xVal){
			absMin.xVal = gesture[i].x;
			absMin.xIndex = i;
		}
		//find min: y
		if (this.gesture[i].y < absMin.yVal){
			absMin.yVal = gesture[i].y;
			absMin.yIndex = i;
		}
	}
	controlPoints.push(absMax.xIndex);
	controlPoints.push(absMax.yIndex);
	controlPoints.push(absMin.xIndex);
	controlPoints.push(absMin.yIndex);	

	var cnt = 0;
	// if this control point is not in master, put it in
	for (var i = 0; i < 4; i++){
		if (this.pointList.indexOf(controlPoints[i]) == -1){
			cnt++;
			this.pointList.push(controlPoints[i]);
		}
	}
	//no subdivisions in this segment => no need to check again
	//otherwise, go back in
	if (cnt == 0){
		return;
	} else {
		this.sortPointList();
		for (var i = 0; i < this.pointList.length - 1; i++){
			this.findSubDiv(
				this.pointList[i],
				this.pointList[i + 1]
			);
		}
	}
}

//Discard point if it is located too close to its neighbours.
GestureToVector.prototype.granularCheck = function(){
	var rmPnts = [];
	for (var i = 0; i < this.pointList.length - 1; i++){
		var j = this.pointList[i];
		var k = this.pointList[i + 1];
		//if j is too close to k, add point to remove list
		 if (this.calcArcLength(j, k) < this.distanceThresh){
			//do not remove endpoints
			if (i == 0) {
				if (rmPnts.indexOf(i + 1) == -1){
					rmPnts.push(i + 1);
				}
			} else if ((i + 1) == this.pointList.length - 1) {
				if (rmPnts.indexOf(i) == -1){
					rmPnts.push(i);
				}
			}
			else {
				if (rmPnts.indexOf(i) == -1){
					rmPnts.push(i);
				}
			}
		}
	}
	//remove points
	for (var i = rmPnts.length - 1; i >= 0; i--){
		this.pointList.splice(rmPnts[i], 1);
	}
	//keep going until all points satisify distance requirement
	if (rmPnts.length > 0){
		this.granularCheck();
	} 
}

/*
 *	Add a point at the midpoint between each of the 
 *	existing points.  Otherwise it is possible for 
 *	the subdivision to ignore important contours of 
 *	the gesture.
 */
GestureToVector.prototype.addMidpoints = function(){
	var tempPnts = [];
	for (var i = 0; i < this.pointList.length - 1; i++){
		var temp = this.getMidpoint(i, i + 1);
		tempPnts.push(temp);
	}
	for (var i = 0; i < tempPnts.length; i++){
		this.pointList.push(tempPnts[i]);
	}
	this.sortPointList();
}

//Populate the vector array with a list of vectors.
GestureToVector.prototype.calcVectors = function(){
	for (var i = 0; i < this.pointList.length - 1; i++){
		var topIndex = this.pointList[i + 1];
		var baseIndex = this.pointList[i];
		var temp = {
			x: this.gesture[topIndex].x - this.gesture[baseIndex].x,
			y: this.gesture[topIndex].y - this.gesture[baseIndex].y
		};
		this.vectors.push(temp);
	}
}

//Calculate the angle between each neighbouring vector in list.
GestureToVector.prototype.calcAngles = function(){
	for (var i = 1; i < this.vectors.length; i++){
		var top = this.dotProduct(this.vectors[i - 1], this.vectors[i]);
		var bottom = this.vectorLength(this.vectors[i - 1]) * 
			this.vectorLength(this.vectors[i]);
		var angle = Math.acos(top / bottom);
		angle = (angle * 180) / Math.PI;
		this.angles.push(angle);
	}
}

/*
 *	If angle is less than a desired degree, assume that 
 *	it does not add anything to the description of the
 *	gesture.  Therefore, we can merge neighbouring vectors.
 */
GestureToVector.prototype.angleCheck = function(){
	var rmPnts = [];
	for (var i = 0; i < this.angles.length; i++){
		if (this.angles[i] < this.angleThresh){
			rmPnts.push(i + 1);
		}
	}
	for (var i = rmPnts.length - 1; i >= 0; i--){
		this.pointList.splice(rmPnts[i], 1);
	}
	if (rmPnts.length > 0){
		return true;
	} else {
		return false;
	}
}

GestureToVector.prototype.getMidpoint = function(index1, index2){
	return Math.floor(
		(this.pointList[index1] + this.pointList[index2]) / 2
	);
}

/*
 *	Approximate a discrete arc length between two points by summing 
 *	each of the Euclidean distances between each of the points.
 */
GestureToVector.prototype.calcArcLength = function(j, k){
	var arcLengthSum = 0;
	for (var i = j; i < k; i++){
		arcLengthSum += this.getPointDistance(i, i + 1);
	}
	return arcLengthSum;
}

//Calculate Euclidean distance between two points.
GestureToVector.prototype.getPointDistance = function(index1, index2){
	var x = this.gesture[index2].x - this.gesture[index1].x;
	var y = this.gesture[index2].y - this.gesture[index1].y;
	return Math.sqrt((x * x) + (y * y));
}

GestureToVector.prototype.sortPointList = function(){
	this.pointList.sort(function(a,b){
		return (a - b);
	});
}

GestureToVector.prototype.dotProduct = function(v, w){
	return (v.x * w.x) + (v.y * w.y);
}

GestureToVector.prototype.vectorLength = function(v){
	return Math.sqrt((v.x * v.x) + (v.y * v.y));
}

GestureToVector.prototype.getVector = function(){
	return this.pointList;
}

GestureToVector.prototype.render = function(graphicsContext){
	if (graphicsContext == null){
		console.log('error: no graphics context provided');
		return;
	}
	var previousStrokeStyle = graphicsContext.strokeStyle;
	var previousFillStyle = graphicsContext.fillStyle;
	var previousLineWidth = graphicsContext.lineWidth;
	graphicsContext.strokeStyle = '#cc0033';
	graphicsContext.fillStyle = '#00cc33';
	graphicsContext.lineWidth = 2;
	//render lines
	graphicsContext.beginPath();
	for (var i = 1; i < this.pointList.length; i++){
		graphicsContext.moveTo(
			this.gesture[this.pointList[i - 1]].x,
			this.gesture[this.pointList[i - 1]].y
		);
		graphicsContext.lineTo(
			this.gesture[this.pointList[i]].x, 
			this.gesture[this.pointList[i]].y
		);
	}
	graphicsContext.closePath();
	graphicsContext.stroke();
	//render points
	for (var i = 0; i < this.pointList.length; i++){
		graphicsContext.fillRect(
			this.gesture[this.pointList[i]].x - 4, 
			this.gesture[this.pointList[i]].y - 4, 
			8, 8
		);
	}
	//reset graphics settings to previous settings
	graphicsContext.strokeStyle = previousStrokeStyle;
	graphicsContext.fillStyle = previousFillStyle;
	graphicsContext.lineWidth = previousLineWidth;
}