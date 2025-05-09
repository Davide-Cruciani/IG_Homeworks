attribute vec3 pos;
attribute vec2 texPos;
attribute vec3 normal;

uniform mat4 trans;
uniform mat4 swap;

varying vec2 vTexPos;
varying vec3 vNormal;


void main()
{
    vNormal = normal;
    vTexPos = texPos;
    gl_Position =  trans*swap*vec4(pos,1);
}