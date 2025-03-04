import * as THREE from 'three'
import { vec2, vec3, mat3 } from "gl-matrix"
(window).vec2 = vec2;
(window).vec3 = vec3;
(window).mat3 = mat3;
const BASE_COLORS = [
    'black',
    'red',
    'blue',
    'green',
    'cyan',
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
]
//import {Camera, Scene, PlaneBufferGeometry, Vector2, RawShaderMaterial}
function set_pixel(image_data, w, x, y, r, g, b) {
    const base_offset = (w * Math.floor(y) + Math.floor(x)) * 4
    image_data[base_offset] = r
    image_data[base_offset + 1] = g
    image_data[base_offset + 2] = b
    image_data[base_offset + 3] = 255

}
function build_affine_transformation(p1, p2, p3, q1, q2, q3) {
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

    constructor(definition_points) {
        this.ifs_canvas = document.getElementById('ifs-canvas');
        this.ifs_context = this.ifs_canvas.getContext('2d', { 'willReadFrequently': true });
        this.w = this.ifs_canvas.width
        this.h = this.ifs_canvas.height
        this.dpr = window.devicePixelRatio;
        this.zoom = 1;
        this.dirty = true
        this.definition_points = definition_points
        this.definition_point_handles = []
        this.draw_fractal = true;
        this.draw_control_points = true
    }
    init() {
        this.init_size()
        this.init_mouse()
        this.init_iterations()
        this.define_handles();
        if (document.getElementById('control-points').checked) {
            this.draw_definition_points();
        }
        if (document.getElementById('fractal').checked) {
            this.animate()
        }
    }
    init_iterations() {
        this.possible_iterations = []
        const arr0 = this.definition_points[0]
        for (let k = 0; k < this.definition_points.length; ++k) {
            const arr = this.definition_points[k]
            const M = build_affine_transformation(
                vec2.fromValues(arr0[0], arr0[1]),
                vec2.fromValues(arr0[2], arr0[3]),
                vec2.fromValues(arr0[4], arr0[5]),
                vec2.fromValues(arr[0], arr[1]),
                vec2.fromValues(arr[2], arr[3]),
                vec2.fromValues(arr[4], arr[5]))
            this.possible_iterations.push(
                (v) => apply_affine_transform(M, v)
            )
        }
        this.p = null;
    }
    animate() {
        const ifs_context = this.ifs_canvas.getContext('2d');
        const w = this.ifs_canvas.width
        const h = this.ifs_canvas.height
        // const base_iteration = (p, v) => {
        //     const out = vec2.create()
        //     vec2.add(out, p, v)
        //     vec2.scale(out, out, .5)
        //     return out
        // }
        const t30 = 0.5 / Math.tan(Math.PI / 6)
        // const possible_iterations = [
        //     (v) => base_iteration(vec2.fromValues(0,1),v),
        //     (v) => base_iteration(vec2.fromValues(1,1),v),
        //     (v) => base_iteration(vec2.fromValues(0.5,1-t30),v)
        // ]


        
        this.p = vec2.fromValues(Math.random(), Math.random())
        ifs_context.fillStyle = 'black'
        const add_point = () => {
            if (this.dirty) {
                this.ifs_context.clearRect(0, 0, this.w, this.h)
                this.dirty = false;
            }
            if (this.p == null) {
                this.p = vec2.fromValues(Math.random(), Math.random())
            }
            if (this.draw_control_points) {
                this.draw_definition_points(false)
            }
            const image_data = ifs_context.getImageData(0, 0, w, h);
            const data = image_data.data
            
        
            for (let k = 0; k < 1000; ++k) {
                ifs_context.beginPath()
                set_pixel(data, w, this.p[0] * w, this.p[1] * h, 0, 0, 0)

                const j = Math.floor(Math.random() * this.possible_iterations.length)
                const iteration = this.possible_iterations[j]
                this.p = iteration(this.p)
            }

            ifs_context.putImageData(image_data, 0, 0)
            if (this.draw_fractal) {
            setTimeout(add_point, 10)
            }
        }
        if (this.draw_fractal) {
            setTimeout(add_point, 100)
        }

    }
    count_handles_to_point(v) {
        let c = 0
        for (let j = 0; j < this.definition_point_handles.length; ++j) {
            if (vec2.dist(v, this.definition_point_handles[j][1]) < 5 / this.w) {
                c = c + 1
            }
        }
        return c
    }
    count_point_multiplicity(v) {
        let c = 0
        for (let k = 0; k < this.definition_points.length; ++k) {
            const arr = this.definition_points[k];
            for (let j = 0; j < arr.length; j += 2) {
                if (vec2.dist(v, vec2.fromValues(arr[j], arr[j + 1])) < 5 / this.w) {
                    c = c + 1
                }
            }
        }
        return c
    }
    handle_to_point_indices(v) {
        const answer = []
        for (let j = 0; j < this.definition_point_handles.length; ++j) {
            if (vec2.dist(v, this.definition_point_handles[j][0]) < 5 / this.w) {
                answer.push(this.definition_point_handles[j])
            }
            if (vec2.dist(v, this.definition_point_handles[j][1]) < 15 / this.w) {
                answer.push(this.definition_point_handles[j])
            }
        }
        return answer;
    }
    define_handles() {
        this.definition_point_handles = []
        for (let k = 0; k < this.definition_points.length; ++k) {
            const arr = this.definition_points[k];
            for (let j = 0; j < arr.length; j += 2) {
                const x1 = arr[j]
                const y1 = arr[j + 1]
                const cnt = this.count_handles_to_point(vec2.fromValues(x1, y1))
                const multip = this.count_point_multiplicity(vec2.fromValues(x1, y1))
                if (multip == 0) {
                    continue
                }
                const ang = 2 * Math.PI / multip * cnt
                const x2 = x1 + Math.cos(ang) / this.w * 20
                const y2 = y1 - Math.sin(ang) / this.h * 20
                this.definition_point_handles.push([
                    vec2.fromValues(x2, y2), vec2.fromValues(x1, y1), k, j])
            }
        }

    }
    draw_definition_points(clear) {
        if (clear) {
            this.ifs_context.clearRect(0, 0, this.w, this.h)
        }
        const w = this.w
        const h = this.h
        for (let k = 0; k < this.definition_points.length; ++k) {
            const arr = this.definition_points[k];
            for (let j = 0; j < arr.length; j += 2) {
                const x1 = arr[j]
                const y1 = arr[j + 1]
                this.ifs_context.fillStyle = BASE_COLORS[j / 2 + 1]
                this.ifs_context.strokeStyle = BASE_COLORS[k]
                this.ifs_context.beginPath();
                this.ifs_context.ellipse(x1 * w, y1 * h, 15, 15, 0, 0, Math.PI * 2);
                this.ifs_context.fill();
                this.ifs_context.lineWidth = 2
                this.ifs_context.stroke()
                this.ifs_context.beginPath();
            }
            this.ifs_context.save()
            this.ifs_context.lineWidth = 0.5
            const l = arr.length // 6
            const hl = l / 2 // 6
            for (let j = 0; j < l; j += 2) {
                // 2*3*2
                const m = Math.floor(j / 6)
                const n = j % 6
                // const in_next_tri = ((m + 1) % 2)*6+n
                const next_in_tri = (j + 2) % 6// m*6+((n + 2) % 6)                 
                const x1 = arr[j]
                const y1 = arr[j + 1]
                const x2 = arr[next_in_tri]
                const y2 = arr[next_in_tri + 1]
                // const x3 = arr[in_next_tri]
                // const y3 = arr[in_next_tri+1]
                this.ifs_context.beginPath();
                this.ifs_context.moveTo(x1 * w, y1 * h);
                this.ifs_context.lineTo(x2 * w, y2 * h);
                this.ifs_context.strokeStyle = BASE_COLORS[k]
                this.ifs_context.lineWidth = k == 0 ? 5 : 0.5
                this.ifs_context.stroke();
                // this.ifs_context.beginPath();          
                // this.ifs_context.moveTo(x1*w, y1*h);
                // this.ifs_context.lineTo(x3*w, y3*h);
                // this.ifs_context.strokeStyle = 'red'                
                // this.ifs_context.lineWidth = 1
                // this.ifs_context.stroke();          
            }
            this.ifs_context.restore()


        }
        for (let k = 0; k < this.definition_point_handles.length; ++k) {
            const v1 = this.definition_point_handles[k][1]
            const v2 = this.definition_point_handles[k][0]
            const idx = this.definition_point_handles[k][2]
            const idx2 = this.definition_point_handles[k][3] / 2
            const x1 = v1[0]
            const y1 = v1[1]
            const x2 = v2[0]
            const y2 = v2[1]

            this.ifs_context.fillStyle = BASE_COLORS[idx]
            // this.ifs_context.beginPath();
            // this.ifs_context.ellipse(x1*w, y1*h, 5, 5, 0, 0, Math.PI * 2);
            // this.ifs_context.fill();    
            this.ifs_context.beginPath();
            this.ifs_context.ellipse(x2 * w, y2 * h, 5, 5, 0, 0, Math.PI * 2);
            this.ifs_context.fill();
            this.ifs_context.strokeStyle = BASE_COLORS[idx2]
            this.ifs_context.lineWidth = 2
            this.ifs_context.stroke();
            this.ifs_context.beginPath();
            this.ifs_context.moveTo(x1 * w, y1 * h);
            this.ifs_context.lineTo(x2 * w, y2 * h);
            this.ifs_context.strokeStyle = BASE_COLORS[k]
            this.ifs_context.lineWidth = 1
            this.ifs_context.stroke();


        }
    }

    init_size() {
        const onWindowResize = (event) => {
            const rect = this.ifs_canvas.getBoundingClientRect()
            this.ifs_canvas.width = rect.width * this.dpr;
            this.ifs_canvas.height = rect.height * this.dpr;
            this.w = this.ifs_canvas.width
            this.h = this.ifs_canvas.height
            this.dirty = true;
        }
        onWindowResize();

        window.addEventListener('resize', onWindowResize, false);

    }
    init_mouse() {
        this.hit = null
        this.ifs_canvas.addEventListener('mousedown', (event) => {
            if (!this.draw_control_points) {
                return
            }
            this.hit = this.handle_to_point_indices(vec2.fromValues(
                event.offsetX * window.devicePixelRatio / this.w,
                event.offsetY * window.devicePixelRatio / this.h))
        })
        this.ifs_canvas.addEventListener('mousemove', (event) => {
            if (this.hit == null) {
                return
            }
            for (let j = 0; j < this.hit.length; ++j) {
                const handle = this.hit[j]
                this.definition_points[handle[2]][handle[3]] = event.offsetX * window.devicePixelRatio / this.w
                this.definition_points[handle[2]][handle[3] + 1] = event.offsetY * window.devicePixelRatio / this.h
            }
            this.define_handles()
            if (this.draw_control_points) {
                this.draw_definition_points(true)
            }
            this.init_iterations()
        })
        this.ifs_canvas.addEventListener('mouseup', (event) => {
            this.hit = null;
        })
        const inputs = document.getElementsByTagName('input')
        for (let input of inputs) {
            input.addEventListener('change', () => {
                this.dirty = true;
                this.draw_fractal = document.getElementById('fractal').checked
                this.draw_control_points = document.getElementById('control-points').checked
            })
        }
    }

}



const SIERPINSKY = [[
    0, 0,
    1, 0,
    0, 1], [
    0, 0,
    0.5, 0,
    0, 0.5
], [0.5, 0,
    1, 0,
    0.5, 0.5],
[0, 0.5,
    0.5, 0.5,
    0, 1
]]
const SQ34 = Math.sqrt(0.75)
const SIERPINSKY2 = [
    [
    .5, 0,
    0, SQ34,
    1, SQ34
],
[
    .5, 0,
    .25, SQ34/2,
    .75, SQ34/2
],
[
    .25, SQ34/2,
    0, SQ34,
    .5, SQ34
],
[
    .75, SQ34/2,
    .5, SQ34,
    1, SQ34
]]
const BUG1_WOW = [[
    0, 0,
    1, 0,
    0, 1,
    0, 0,
    0.5, 0,
    0, 0.5
], [0, 0,
    1, 0,
    0, 1,
    0.5, 0,
    1, 0,
    0.5, 0.5],
[0, 0,
    1, 0,
    0, 1,
    0, 0.5,
    0.5, 0.5,
    0, 0
]]
const FERN = [[
    0,0,
    0,1,
    1,0,
],
[ 0.  ,  0.  ,  0.  ,  0.16,  0.  ,  0.16],
       [ 0.  ,  1 ,  0.04,  0.85,  0.89,  .41],
       [ 0.  ,  1 ,  0.26,  0.22,  0.06,  .05],
       [ 0.  ,  0.4,  0.2,  0.24,  0.13,  0.94]
]
const FERN_WIP = [
    [0,0.008305647840531562,0.013289036544850499,0.9916943521594684,1,0],
    [0.3588039867109635,0.29069767441860467,0.11461794019933555,0.132890365448505,0.42524916943521596,0.22757475083056478],
    [0.49667774086378735,0.20431893687707642,0.659468438538206,0.5614617940199336,0.41029900332225916,0.3122923588039867],[0.4335548172757475,0.1378737541528239,0.43853820598006643,0.0016611295681063123,0.4750830564784053,0.018272425249169437],[0.31727574750830567,0.059800664451827246,0.046511627906976744,0.9186046511627907,0.739202657807309,0.6079734219269103]]
const FERN_WIP2 = [[0.521594684385382,0.6794019933554817,0.287375415282392,0.2691029900332226,0.8554817275747508,0.28903654485049834],[0.2691029900332226,0.5099667774086378,0.5049833887043189,0.33554817275747506,0.5498338870431894,0.49667774086378735],[0.5448504983388704,0.4269102990033223,0.5448504983388704,0.2840531561461794,0.5581395348837209,0.2823920265780731],[0.5282392026578073,0.6677740863787376,0.29900332225913623,0.4069767441860465,0.8172757475083057,0.3023255813953488],[0.8056478405315615,0.5182724252491694,0.5813953488372093,0.3289036544850498,0.5083056478405316,0.4850498338870432]]
const FERN_CHATGPT = [[
    0,0,
    0,1,
    1,0,
],
    [0.4979, 0.4372, 0.4979, 0.4372, 0.4979, 0.5972],
    [0.4979, 0.5506, 1.3479, 0.5106, 0.5379, 1.4006],
    [0.4979, 0.5506, 0.6979, 0.7806, 0.2379, 0.7706],
    [0.4979, 0.4783, 0.3479, 0.7383, 0.7779, 0.7183]
  ]
// 0	0	0	0.16	0	0	0.01	Stem
// f2	0.85	0.04	−0.04	0.85	0	1.60	0.85	Successively smaller leaflets
// f3	0.20	−0.26	0.23	0.22	0	1.60	0.07	Largest left-hand leaflet
// f4	−0.15	0.28	0.26	0.24	0	0.44	0.07	Largest right-hand leaflet
function app_ignite() {
    const url = new URL(window.location.href);
    const url_params = new URLSearchParams(url.search)
    const root_count = (url_params && url_params.get("root_count")) || 5;
    window._app = new App(FERN_WIP2);

    window._app.init();
}

window.addEventListener('load', app_ignite);
