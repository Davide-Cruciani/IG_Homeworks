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
	trans = MatrixMult(trans, rotation);
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		var objectVS = `
			attribute vec3 pos;
			attribute vec2 texPos;

			uniform mat4 trans;
			uniform mat4 swap;

			varying vec2 vTexPos;

			void main(){
				vTexPos = texPos;
				gl_Position =  trans*swap*vec4(pos,1);
			}
		`
		var objectFS =`
			precision mediump float;

			uniform int uUseTexture;
			uniform sampler2D uTexture;

			varying vec2 vTexPos;


			void main(){
				if(uUseTexture == 0){
					gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
				}
				else{
					gl_FragColor = texture2D(uTexture, vTexPos);
				}
			}
		`
		// [TO-DO] initializations
		this.vertBuffer = gl.createBuffer();
		this.texturePoss = gl.createBuffer();
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

		var matrix = gl.getUniformLocation(prog, 'trans');
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

		var matrixRot = gl.getUniformLocation(this.program, 'trans');
		gl.uniformMatrix4fv(matrixRot, false, trans);

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
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
	}
}
