// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var sX = Math.sin(-rotationX);
	var cX = Math.cos(-rotationX);
	var sY = Math.sin(-rotationY);
	var cY = Math.cos(-rotationY);
		
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	
	var rX = [
		1,0,0,0,
		0,cX,-sX,0,
		0,sX,cX,0,
		0,0,0,1
	];

	var rY = [
		cY,0,sY,0,
		0,1,0,0,
		-sY,0,cY,0,
		0,0,0,1
	];
	
	var rotation = MatrixMult(rY,rX);
	var mv = MatrixMult(trans, rotation);
	return mv;
}


class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		var objectVS = `
			attribute vec3 pos;
			attribute vec2 texPos;
			attribute vec3 normal;

			uniform mat4 matMVP;
			uniform mat4 swap;
			uniform mat4 matNorm;
			uniform mat4 matMV;

			varying vec2 vTexPos;
			varying vec3 vNormal;
			varying vec3 vViewVec;


			void main()
			{
				vTexPos = texPos;
				vViewVec = (matMVP * matMV * swap * vec4(pos,1)).xyz; 
				vNormal = (matMVP * swap * vec4(normal,0)).xyz;
				gl_Position =  matMVP * swap * vec4(pos,1);
			}
		`
		
		var objectFS = `
			precision mediump float;

			uniform int uUseTexture;
			uniform sampler2D uTexture;
			uniform vec3 lightDir;
			uniform float shininess;

			varying vec3 vViewVec;
			varying vec2 vTexPos;
			varying vec3 vNormal;


			void main()
			{
				const float intensity = 1.0;
				const float baseIntensity = 0.1;
				vec3 n = normalize(vNormal);
				vec3 w = normalize(lightDir);

				vec4 baseColor = (uUseTexture == 0) ? 
					vec4(1,1,1,1) : 
					texture2D(uTexture, vTexPos);
				
				float cosTheta = max(0.0, dot(w, n)); 
				vec3 h = normalize(w + normalize(-vViewVec));
				float cosPhi = max(0.0, dot(n, h));
				vec4 lightColor = vec4(1);

				vec4 baseColorComp = baseColor * cosTheta;
				vec4 lightComp = lightColor * pow(cosPhi, shininess);

				gl_FragColor = intensity * (baseColorComp + lightComp); + (baseColor*baseIntensity);
			}
		`
		// [TO-DO] initializations
		this.vertBuffer = gl.createBuffer();
		this.texturePoss = gl.createBuffer();
		this.normals = gl.createBuffer();
		const vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, objectVS);
		gl.compileShader(vs);
		if (! gl.getShaderParameter(vs, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(vs));
			console.error("Vertex shader failed to link:", gl.getShaderInfoLog(vs));
			gl.deleteShader(vs);
			return;
		}

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, objectFS);
		gl.compileShader(fs);
		if (! gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(fs));
			console.error("Fragment shader failed to link:", gl.getShaderInfoLog(fs));
			gl.deleteShader(fs);
			return;
		}

		var prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if(! gl.getProgramParameter(prog, gl.LINK_STATUS)){
			alert(gl.getProgramInfoLog(prog));
			console.error("Program failed to link:", gl.getProgramInfoLog(prog));
			gl.deleteProgram(prog);
			return;
		}

		this.program = prog

		var matrix = gl.getUniformLocation(prog, 'matMVP');
		var identity = [
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1
		];
		gl.useProgram(prog);
		gl.uniformMatrix4fv(matrix, false, identity);

		var swapMatrix = gl.getUniformLocation(prog, 'swap');
		var smat = [
			1,0,0,0,
			0,1,0,0,
			0,0,1,0,
			0,0,0,1
		];
		gl.uniformMatrix4fv(swapMatrix, false, smat);

		var useTexture = gl.getUniformLocation(prog, 'uUseTexture');
		gl.uniform1i(useTexture, 0);

		this.texture = gl.createTexture();
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		var vertexesPosition = gl.getAttribLocation(this.program, 'pos');
		if(vertexesPosition ===-1){
			console.error('vertexPosition not found');
			return;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.vertexAttribPointer(vertexesPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexesPosition);

		var texturePosition = gl.getAttribLocation(this.program, 'texPos');
		if(texturePosition ===-1){
			console.error('texturePosition not found');
			return;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texturePoss);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		gl.vertexAttribPointer(texturePosition, 2, gl.FLOAT, false, 0,0);
		gl.enableVertexAttribArray(texturePosition);

		var normalsPtr = gl.getAttribLocation(this.program, 'normal');
		if(normalsPtr ===-1){
			console.error('normal not found');
			return;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		gl.vertexAttribPointer(normalsPtr, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(normalsPtr);

		this.numTriangles = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		gl.useProgram(this.program);
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		var swapMatrix = gl.getUniformLocation(this.program, 'swap');
		if(swapMatrix === -1){
			console.error("Swap matrix not found");
			return;
		}
		if (!swap){
			var smat = [
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1
			];
			gl.uniformMatrix4fv(swapMatrix, false, smat);
		}else{
			var smat = [
				1,0,0,0,
				0,0,1,0,
				0,1,0,0,
				0,0,0,1
			];
			gl.uniformMatrix4fv(swapMatrix, false, smat);
		}
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram(this.program);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		var matrixMVP_ptr = gl.getUniformLocation(this.program, 'matMVP');
		if (matrixMVP_ptr === -1){
			console.error("matMVP not found");
			return;
		}
		gl.uniformMatrix4fv(matrixMVP_ptr, false, matrixMVP);

		var matrixMV_ptr = gl.getUniformLocation(this.program, 'matMV');
		if (matrixMV_ptr === -1){
			console.error("matMV not found");
			return;
		}
		gl.uniformMatrix4fv(matrixMV_ptr, false, matrixMV);

		var normalMatrix_ptr = gl.getUniformLocation(this.program, 'matNorm');
		if (normalMatrix_ptr === -1) {
			console.error("matNorm not found");	
			return;
		}
		gl.uniformMatrix4fv(normalMatrix_ptr, false, matrixNormal);
		

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		var vertexesPosition = gl.getAttribLocation(this.program, 'pos');
		gl.vertexAttribPointer(vertexesPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexesPosition);

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		gl.useProgram(this.program);
		// [TO-DO] Bind the texture
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap(gl.TEXTURE_2D);
		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		var uTexturePtr = gl.getUniformLocation(this.program, 'uTexture');
		if(uTexturePtr === -1){
			console.error('Texture location not found');
			return;
		}
		gl.uniform1i(uTexturePtr, 0);
		this.showTexture(true);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.program);
		var usingTexture = gl.getUniformLocation(this.program, 'uUseTexture');
		if(usingTexture	=== -1){
			console.error('uUseTexture not found');
			return;
		}
		if (show){
			gl.uniform1i(usingTexture, 1);
		}else{
			gl.uniform1i(usingTexture, 0);
		}
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
		gl.useProgram(this.program);
		var lightDir = gl.getUniformLocation(this.program, 'lightDir');
		if (lightDir === -1){
			console.error('lightDir not found')
			return;
		}
		gl.uniform3f(lightDir,x,y,z);
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		gl.useProgram(this.program);
		var shininessPtr = gl.getUniformLocation(this.program, 'shininess');
		if(shininessPtr === -1){
			console.error('shininess not found');
			return;
		}
		gl.uniform1f(shininessPtr, shininess);
	}
}



// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	// [TO-DO] Compute the total force of each particle
	const particleCount = positions.length;
	var forces = Array(particleCount); // The total for per particle
	for(let i=0;i<particleCount;i++){
		forces[i] = gravity.mul(particleMass);
	}
	for (let i=0;i<springs.length;i++){
		var p0 = springs[i].p0;
		var p1 = springs[i].p1;
		var rest = springs[i].rest;
		
		deltaX = (positions[p1].sub(positions[p0])).len();
		directionD = (positions[p1].sub(positions[p0])).div(deltaX);
		Fs0 = directionD.mul(stiffness*(deltaX-rest));

		lDot = (velocities[p1].sub(velocities[p0])).dot(directionD);
		Fd0 = directionD.mul(damping*lDot);

		forces[p0].inc(Fs0.add(Fd0));
		forces[p1].dec(Fs0.add(Fd0));
	}

	
	// [TO-DO] Update positions and velocities
	for(let i=0;i<particleCount;i++){
		acceleration = forces[i].div(particleMass);
		var pos = positions[i].copy();
		var vel = velocities[i].copy();
		vel.inc(acceleration.mul(dt));
		pos.inc(vel.mul(dt))
		positions[i].set(pos);
		velocities[i].set(vel);
	}

	// [TO-DO] Handle collisions
	
}

