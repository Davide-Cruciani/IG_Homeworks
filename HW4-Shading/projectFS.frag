precision mediump float;

uniform int uUseTexture;
uniform sampler2D uTexture;
uniform vec3 lightDir;
uniform float shininess;

varying vec2 vTexPos;
varying vec3 vNormal;


void main()
{
	vec4 baseColor = vec4(0);
	
	float cosTheta = dot(normalize(lightDir), normalize(vNormal)); 

	//float cosPhi = dot(normalize(vNormal), normalize());

	if(uUseTexture == 0)
	{
		baseColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
	}
	else
	{
		baseColor = texture2D(uTexture, vTexPos);
	}
	
}

