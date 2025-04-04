import * as THREE from 'three'
import { vec2, vec3, mat3 } from "gl-matrix"
(window).vec2 = vec2;
(window).vec3 = vec3;
(window).mat3 = mat3;
const BASE_COLORS = [
    '#ef476fff',
    '#ffd166ff',
    '#06d6a0ff',
    '#118ab2ff',
    '#073b4cff',
    '#eae4e9ff',
    '#fff1e6ff',
    '#fde2e4ff',
    '#fad2e1ff',
    '#e2ece9ff',
    '#bee1e6ff',
    '#f0efebff',
    '#dfe7fdff',
    '#cddafdff',    
]


//import {Camera, Scene, PlaneBufferGeometry, Vector2, RawShaderMaterial}
function set_pixel(image_data, h, w, x, y, r, g, b) {
    if (x >w || x< 0 ||y >h || y< 0) {
        return
    }
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
function index_of_first_higher_number(sorted_list, number) {
    for (let j = 0; j < sorted_list.length; ++j) {
        if (sorted_list[j]> number) {
            return j
        }
    }

}
class App {

    constructor(initial_examples, first_example_name) {
        this.example_catalog = initial_examples
        this.example_name = first_example_name

        this.ifs_canvas = document.getElementById('ifs-canvas');
        this.ifs_context = this.ifs_canvas.getContext('2d', { 'willReadFrequently': true });
        this.w = this.ifs_canvas.width
        this.h = this.ifs_canvas.height
        this.dpr = window.devicePixelRatio;
        this.zoom = 1;
        this.dirty = true
        this.definition_points = [...initial_examples[first_example_name]]
        this.definition_point_handles = []
        this.draw_fractal = true;
        this.draw_control_points = true
    }
    init() {
        this.init_size();
        this.init_mouse();
        this.init_iterations();
        this.define_handles();
        if (document.getElementById('control-points').checked) {
            this.draw_definition_points();
        }
        if (document.getElementById('fractal').checked) {
            this.animate()
        }
    }
    init_iterations() {
        const definition_points = [...this.example_catalog[this.example_name]]
        this.possible_iterations = []
        this.total_probability_array = []
        this.total_probability = 0
        const arr0 = definition_points[0]
        for (let k = 1; k < definition_points.length; ++k) {
            const arr = definition_points[k]
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
            this.total_probability_array.push(this.total_probability)
            this.total_probability += arr[6] || 1
        }
        this.definition_points = definition_points;
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



        this.p = vec2.fromValues(0,0);
        ifs_context.fillStyle = 'black'
        const add_point_batch = () => {
            if (this.dirty) {
                this.ifs_context.clearRect(0, 0, this.w, this.h)
                this.dirty = false;
            }
            if (this.p == null) {
                this.p = vec2.fromValues(0,0)
            }
            if (this.draw_control_points) {
                this.draw_definition_points(false)
            }
            const image_data = ifs_context.getImageData(0, 0, w, h);
            const data = image_data.data


            for (let k = 0; k < 10000; ++k) {
                ifs_context.beginPath()
                set_pixel(data, h, w, this.p[0] * w, this.p[1] * h, 0, 0, 0)
                // const random_number = this.total_probability*Math.random()
                // const random_iteration = index_of_first_higher_number(this.total_probability_array, random_number)
                const random_number = Math.floor(Math.random()* this.possible_iterations.length)
                const iteration = this.possible_iterations[random_number]
                if (iteration) {
                    this.p = iteration(this.p)
                }
            }

            ifs_context.putImageData(image_data, 0, 0)
            if (this.draw_fractal) {
                setTimeout(add_point_batch, 10)
            }
        }
        if (this.draw_fractal) {
            setTimeout(add_point_batch, 100)
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
                this.ifs_context.ellipse(x1 * w, y1 * h, 5, 5, 0, 0, Math.PI * 2);
                this.ifs_context.fill();
                this.ifs_context.lineWidth = 2
                //this.ifs_context.stroke()
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
                this.ifs_context.lineWidth = k == 0 ? 2 : 0.5
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
            // this.ifs_context.ellipsse(x1*w, y1*h, 5, 5, 0, 0, Math.PI * 2);
            // this.ifs_context.fill();    
            this.ifs_context.beginPath();
            this.ifs_context.ellipse(x2 * w, y2 * h, 2, 2, 0, 0, Math.PI * 2);
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
        const select = document.getElementById('fractal_select')
        select.innerHTML = ''
        
        for (let example_name in this.example_catalog) {
            const option_element = document.createElement('option')
            option_element.innerHTML = example_name
            option_element.value = example_name
            select.appendChild(option_element)

        }
        select.value = this.example_name;
        select.addEventListener('change', (event) => {
            this.example_name = event.target.value
            this.dirty = true;
            this.init_iterations();
            this.define_handles();
        })

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
const SIERPINSKY_EQUI = [
    [
        .5, 0,
        0, SQ34,
        1, SQ34
    ],
    [
        .5, 0,
        .25, SQ34 / 2,
        .75, SQ34 / 2
    ],
    [
        .25, SQ34 / 2,
        0, SQ34,
        .5, SQ34
    ],
    [
        .75, SQ34 / 2,
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
const FERN = [[0,0.9916943521594684,0.1877076411960133,0.23588039867109634,1,1],
[0.42358803986710963,0.7225913621262459,0.059800664451827246,0.5548172757475083,0.3554817275747508,0.8156146179401993,90],
[0.4700996677740864,0.6943521594684385,0.7574750830564784,0.49335548172757476,0.6129568106312292,0.8073089700996677,1],
[0.4584717607973422,0.8604651162790697,0.4269102990033223,0.9916943521594684,0.4269102990033223,0.9916943521594684,1],
[0.09800664451827246,0.9501661129568106,0.16279069767441862,0.16777408637873759,0.9368770764119602,0.739202657807309,1]
]

const EIFFEL = [[0.5,0,0,0.8660254037844386,1,0.8660254037844386],[0.5,0,0.5598006644518272,0.5182724252491694,0.45182724252491696,0.5049833887043189],[0.45348837209302323,0.5132890365448505,0,0.8660254037844386,0.526578073089701,0.840531561461794],[0.5598006644518272,0.5232558139534884,0.526578073089701,0.840531561461794,1,0.8660254037844386]]
const PAALULA = [[0.6229235880398671, 0.21760797342192692, 0.4269102990033223, 0.5913621262458472, 0.7906976744186046, 0.7225913621262459], [0.6229235880398671, 0.21760797342192692, 0.5282392026578073, 0.7259136212624585, 0.75, 0.4330127018922193], [0.5282392026578073, 0.7259136212624585, 0.4269102990033223, 0.5913621262458472, 0.49335548172757476, 0.5382059800664452], [0.75, 0.4330127018922193, 0.49335548172757476, 0.5382059800664452, 0.7906976744186046, 0.7225913621262459]]
// 0	0	0	0.16	0	0	0.01	Stem
// f2	0.85	0.04	−0.04	0.85	0	1.60	0.85	Successively smaller leaflets
// f3	0.20	−0.26	0.23	0.22	0	1.60	0.07	Largest left-hand leaflet
// f4	−0.15	0.28	0.26	0.24	0	0.44	0.07	Largest right-hand leaflet
const examples = {
    sierpinsky: SIERPINSKY,
    sierpinsky_equilateral: SIERPINSKY_EQUI,
    bug_wow: BUG1_WOW,
    fern: FERN,
    paalula: PAALULA,
    eiffel: EIFFEL
}
function app_ignite() {
    const url = new URL(window.location.href);
    const url_params = new URLSearchParams(url.search)
    const root_count = (url_params && url_params.get("root_count")) || 5;
    window._app = new App(examples, 'fern');

    window._app.init();
}

window.addEventListener('load', app_ignite);
