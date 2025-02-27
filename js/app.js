import * as THREE from 'three'
import {vec2, vec3, mat3} from "gl-matrix"
(window).vec2 = vec2;
(window).vec3 = vec3;
(window).mat3 = mat3;

//import {Camera, Scene, PlaneBufferGeometry, Vector2, RawShaderMaterial}
function set_pixel(image_data, w, x, y,r,g,b) {
    const base_offset = (w*Math.floor(y)+Math.floor(x))*4
    image_data[base_offset] = r
    image_data[base_offset+1] = g
    image_data[base_offset+2] = b
    image_data[base_offset+3] = 255

}
function build_affine_transformation(p1,p2,p3,q1,q2,q3) {
    let P = mat3.fromValues(
        p1[0], p1[1], 1,
        p2[0], p2[1], 1,
        p3[0], p3[1], 1,
    );

    let Q = mat3.fromValues(
        q1[0], q1[1], 1,
        q2[0], q2[1], 1,
        q3[0], q3[1], 1,
    );

    // Invert P
    let P_inv = mat3.create();
    if (!mat3.invert(P_inv, P)) {
        throw new Error("Source points are collinear or invalid for affine transformation.");
    }

    // Compute A = Q * P^-1
    let A = mat3.create();
    mat3.multiply(A, Q, P_inv);
    return A;
}
function apply_affine_transform(A, v) {
    // Convert vec2 to homogeneous coordinates (vec3)
    let v3 = vec3.fromValues(v[0], v[1], 1); // Convert vec2 → vec3 (homogeneous coords)
    let result = vec3.create();
    vec3.transformMat3(result, v3, A);
    return result//vec2.fromValues(result[0], result[1]); // Drop homogeneous coordinate
}

class App {

    constructor() {
        this.ifs_canvas = document.getElementById('ifs-canvas');
        this.dpr= window.devicePixelRatio;
        this.zoom = 1;
        this.dirty = true
    }



    event_to_complex_coords(e) {
        return new THREE.Vector2((e.offsetX * this.dpr
    -this.ifs_canvas.width/2)/this.zoom,
    -(e.offsetY * this.dpr
    -this.ifs_canvas.height/2)/this.zoom)
    }
    event_to_mouse_coords(e) {
        return new THREE.Vector2(e.offsetX * this.dpr,
        (this.ifs_canvas.height - e.offsetY * this.dpr))
    }
    init() {
        this.init_size()

        this.animate()
    }
    render() {
        

    }
    animate() {
        const ifs_context = this.ifs_canvas.getContext('2d');
        // const base_iteration = (p, v) => {
        //     const out = vec2.create()
        //     vec2.add(out, p, v)
        //     vec2.scale(out, out, .5)
        //     return out
        // }
        const t30= 0.5/Math.tan(Math.PI/6)
        // const possible_iterations = [
        //     (v) => base_iteration(vec2.fromValues(0,1),v),
        //     (v) => base_iteration(vec2.fromValues(1,1),v),
        //     (v) => base_iteration(vec2.fromValues(0.5,1-t30),v)
        // ]
        const base_iteration = (A,v) => {
            let out3 = vec3.fromValues(v[0], v[1], v[2])
            mat3.multiply


        }
        const possible_iterations = [
            (v) => apply_affine_transform(
                build_affine_transformation(
                    vec2.fromValues(0,0),
                    vec2.fromValues(1,0),
                    vec2.fromValues(0,1),
                    vec2.fromValues(0,0),
                    vec2.fromValues(0.5,0),
                    vec2.fromValues(0,0.5)
                    
                    
                    ), v
            ),
            (v) => apply_affine_transform(
                build_affine_transformation(
                    vec2.fromValues(0,0),
                    vec2.fromValues(1,0),
                    vec2.fromValues(0,1),
                    vec2.fromValues(0.5,0),
                    vec2.fromValues(1,0),
                    vec2.fromValues(0.5,0.5)                
                    ), v
            ),
            (v) => apply_affine_transform(
                build_affine_transformation(
                    vec2.fromValues(0,0),
                    vec2.fromValues(1,0),
                    vec2.fromValues(0,1),
                    vec2.fromValues(0,0.5),
                    vec2.fromValues(0.5,0.5),
                    vec2.fromValues(0,1)                
                    ), v
            ),
        ]
        const w = this.ifs_canvas.width
        const h = this.ifs_canvas.height
        
        let p0 = vec2.fromValues(Math.random(), Math.random())
        ifs_context.fillStyle = 'black'
        const image_data = ifs_context.getImageData(0,0,w,h);
        const data = image_data.data
        const add_point = () => {
            for (let k =0; k<100; ++k) {
                ifs_context.beginPath()
                set_pixel(data, w, p0[0]*w, p0[1]*h,0,0,0)

                const j = Math.floor(Math.random()* possible_iterations.length)
                const iteration = possible_iterations[j]
                p0 = iteration(p0)
            }
            ifs_context.putImageData(image_data,0,0)
            setTimeout(add_point,1)
        }

        setTimeout(add_point,1)

    }
    init_size() {
        const onWindowResize =(event) =>{
            const rect = this.ifs_canvas.getBoundingClientRect()
            this.ifs_canvas.width = rect.width * this.dpr;
            this.ifs_canvas.height = rect.height * this.dpr;
            this.zoom = 0.4*Math.min(rect.width, rect.height) * this.dpr;
            this.dirty = true;
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);

    }
    
        
}




function app_ignite() {
    const url = new URL(window.location.href);
    const url_params = new URLSearchParams(url.search)
    const root_count = (url_params && url_params.get("root_count")) || 5;
    window._app = new App(root_count);
    
    window._app.init();
}

window.addEventListener('load', app_ignite);
