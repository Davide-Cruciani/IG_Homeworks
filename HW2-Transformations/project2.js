function getRotation(rot)
{
 	const angle = (rot/180)*Math.PI;
	const cosVal = Math.cos(angle);
	const sinVal = Math.sin(angle);
	return Array(
		cosVal, sinVal, 0,
		-sinVal, cosVal, 0,
		0,0,1
	);
}

function getTranslation(posX, posY)
{
	return Array(
		1,0,0,
		0,1,0,
		posX, posY, 1
	);
}

function getScale(scale)
{
	return Array(
		scale,0,0,
		0,scale,0,
		0,0,1
	);
}


// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{
	const t1 = getScale(scale);
	const t2 = getRotation(rotation);
	const t3 = getTranslation(positionX, positionY);

	const step1 = ApplyTransform(t1, t2);

	return ApplyTransform(step1, t3);

	// const angle = (rot/180)*Math.PI;
	// const cosVal = Math.cos(angle);
	// const sinVal = Math.sin(angle);
	//return Array(scale*cosVal, scale*sinVal, 0,-scale*sinVal, scale*cosVal, 0,positionX,positionY,1);
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
	let res = Array(0,0,0,0,0,0,0,0,0);
	for(let col=0;col<3;col++)
		for(let row=0;row<3;row++)
			for(let k=0;k<3;k++){
				res[col*3+row] += trans2[row + 3*k]*trans1[k+col*3];
			}
	return res;
}
