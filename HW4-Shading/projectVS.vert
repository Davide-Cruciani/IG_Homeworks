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