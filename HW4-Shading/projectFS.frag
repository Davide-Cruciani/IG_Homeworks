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