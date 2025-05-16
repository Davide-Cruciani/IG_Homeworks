var raytraceFS = `


struct Ray {
	vec3 pos;
	vec3 dir;
	};
	
	struct Material {
		vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
	};
	
	struct Sphere {
		vec3     center;
		float    radius;
		Material mtl;
		};
		
		struct Light {
			vec3 position;
			vec3 intensity;
			};

			struct HitInfo {
				float    t;
				vec3     position;
				vec3     normal;
	Material mtl;
	};
	
	uniform Sphere spheres[ NUM_SPHERES ];
	uniform Light  lights [ NUM_LIGHTS  ];
	uniform samplerCube envMap;
	uniform int bounceLimit;
	
	float bias = 0.002;

	bool IntersectRay( inout HitInfo hit, Ray ray );
	
	// Intersects the given ray with all spheres in the scene
	// and updates the given HitInfo using the information of the sphere
	// that first intersects with the ray.
	// Returns true if an intersection is found.
	bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		// TO-DO: Test for ray-sphere intersection
		float r = spheres[i].radius;
		vec3 centre = spheres[i].center;
		vec3 d = ray.dir;
		vec3 p = ray.pos;

		float a = dot(d,d);
		float b = 2.0*dot(d,p-centre);
		float c = dot(p-centre, p-centre)-pow(r,2.0);

		float delta = pow(b,2.0) - 4.0*a*c;
		// TO-DO: If intersection is found, update the given HitInfo
		if (delta>=0.0){
			foundHit = true;
			float sDelta = sqrt(delta);
			float t1 = (-b-sDelta)/(2.0*a);
			float t2 = (-b+sDelta)/(2.0*a);
			
			float t = 1e30;
			if(t1>bias && t1<t) t=t1;
			if(t2>bias && t2<t) t=t2;

			if (t<hit.t){
				hit.t = t;
				hit.position = ray.pos + ray.dir * t;
				hit.mtl = spheres[i].mtl;
				hit.normal = normalize(hit.position - centre);
			}
		}		
	}
	return foundHit;
}

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		// TO-DO: Check for shadows
		vec3 vectorToLight = lights[i].position - position;
        float lightDist = length(vectorToLight);
		vec3 normLight = normalize(vectorToLight);
		Ray shadowRay;
		shadowRay.dir = normLight;
		shadowRay.pos = position + normal * 0.001;
		HitInfo info;
        bool collision = IntersectRay(info, shadowRay);
        if (collision && info.t < lightDist )
			continue;
		// TO-DO: If not shadowed, perform shading using the Blinn model
		vec3 hVector = normalize(normLight + view);
		float cosinePhi = max(0.0, dot(normal, hVector));
		float cosineTheta = max(0.0, dot(normal, normLight));
		color += lights[i].intensity * (mtl.k_d * cosineTheta + mtl.k_s * pow(cosinePhi, mtl.n)) + 0.1 * mtl.k_d;
	}
	return color;
}



// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		vec3 lastPosition = hit.position + hit.normal*bias;
		vec3 lastDir = normalize(2.0*dot(view, hit.normal)*hit.normal - view);
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( k_s.r + k_s.g + k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// TO-DO: Initialize the reflection ray
			
			r.pos = lastPosition;
			r.dir = lastDir;

			if ( IntersectRay( h, r ) ) {
				// TO-DO: Hit found, so shade the hit point
				vec3 viewDir = normalize(-r.dir);
				clr += k_s * Shade(h.mtl, h.position, h.normal, viewDir);
				// TO-DO: Update the loop variables for tracing the next reflection ray
				k_s = h.mtl.k_s;
				lastPosition = h.position + h.normal*bias;
				lastDir = normalize(reflect(r.dir, h.normal));
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;