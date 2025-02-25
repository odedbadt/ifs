import * as THREE from 'three'
import {vec2} from "gl-matrix"
//import {Camera, Scene, PlaneBufferGeometry, Vector2, RawShaderMaterial}
function set_pixel(image_data, w, x, y,r,g,b) {
    const base_offset = (w*Math.floor(y)+Math.floor(x))*4
    image_data[base_offset] = r
    image_data[base_offset+1] = g
    image_data[base_offset+2] = b
    image_data[base_offset+3] = 255

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
        this.init_mouse_events()
        this.init_scroll()
        this.animate()
    }
    render() {
        

    }
    animate() {
        const ifs_context = this.ifs_canvas.getContext('2d');
        const base_iteration = (p, v) => {
            const out = vec2.create()
            vec2.add(out, p, v)
            vec2.scale(out, out, .5)
            return out
        }
        const t30= 0.5/Math.tan(Math.PI/6)
        const possible_iterations = [
            (v) => base_iteration(vec2.fromValues(0,1),v),
            (v) => base_iteration(vec2.fromValues(1,1),v),
            (v) => base_iteration(vec2.fromValues(0.5,1-t30),v)
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
    init_mouse_events() {
        // non symmetrical application of zoom as written in shader:
        // dist2(u_mouse_coord.xy, coord*u_zoom+u_resolution.xy/2.0) < 100.0)
        // coord = 
        const h_w = this.ifs_canvas.width/2
        const h_h = this.ifs_canvas.height/2;
        console.log('HW', h_w)
        console.log('HW', h_h)
        const dist2z = (mouse_coord_v2, root_arr) => 
            (mouse_coord_v2.x-(root_arr[0]*this.zoom +h_w))*(mouse_coord_v2.x-(root_arr[0]*this.zoom +h_w))+
            (mouse_coord_v2.y-(root_arr[1]*this.zoom +h_h))*(mouse_coord_v2.y-(root_arr[1]*this.zoom +h_h))
        this.ifs_canvas.addEventListener('mousedown', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            console.log(this.mouse);
            for (let j = 0; j < this.n; ++j) {
                if (dist2z(this.mouse, this.roots[j]) < 100*this.dpr*this.dpr) {
                    this._dragged_root = j;

                }
            }
            this.dirty = true
        })
        this.ifs_canvas.addEventListener('mousemove', (e) => {
            this.mouse = this.event_to_mouse_coords(e)
            const coord = this.event_to_complex_coords(e)
            //console.log(coord)
            if (this._dragged_root != null) {
              //  console.log('D',this._dragged_root)
                this.roots[this._dragged_root] = [coord.x,coord.y]
            }        
            this.dirty = true
        })
        this.ifs_canvas.addEventListener('mouseup', (e) => {
            this._dragged_root = null;
            this.dirty = true
        })
    }
    init_scroll() {
        this.ifs_canvas.addEventListener('wheel', (event) => {
            event.preventDefault()
            // Get the modifiers pressed
            const ctrl_key = event.ctrlKey;
          
            // Access scroll properties
            const deltaX = event.deltaX; // Horizontal scroll
            const deltaY = event.deltaY; // Vertical scroll
          
          
            // Perform actions based on modifiers and scroll direction
            if (ctrl_key) {
                // Zoom:;
                // view_port.h, w changes
                // cursor in before and in after change has to be contant
                // const art_x_before_zoom = this.state.view_port.x + event.offsetX  / 
                // this.view_canvas.clientWidth * this.state.view_port.w;
                /* equations:
                // view_port_x_before + cursor_x*view_port_w_before / view_canvas_w = 
                // view_port_x_after + cursor_x*view_port_w_after  / view_canvas_w
                // view_port_y_before + cursor_x*view_port_h_before / view_canvas_h = 
                // view_port_y_after + cursor_x*view_port_h_after  / view_canvas_h
                // thus:
                // view_port_y_after = view_port_y_before + cursor_y*(view_port_h_before-view_port_h_after) / view_canvas_h
                // view_port_x_after = view_port_x_before + cursor_x*(view_port_w_before-view_port_w_after) / view_canvas_w
                // view_port_y_after = view_port_y_before + cursor_y*deltaY/ view_canvas_h
                // view_port_x_after = view_port_y_after*aspect;
                */
                this.zoom = this.zoom + deltaY;
                // const aspect = this.state.view_port.w / this.state.view_port.h;
                // const ratio_h = Math.exp(deltaY/1000);
                // const delta_h = this.state.view_port.h*(ratio_h-1)
                // this.state.view_port.y = this.state.view_port.y - event.offsetY * delta_h/ this.view_canvas.clientHeight;
                // this.state.view_port.x = this.state.view_port.x - event.offsetX * delta_h*aspect/ this.view_canvas.clientWidth;
                // this.state.view_port.h = Math.max(1, this.state.view_port.h*ratio_h)
                // this.state.view_port.w = this.state.view_port.h*aspect;
            } else {
                // this.state.view_port.y = Math.max(0, this.state.view_port.y+deltaY/ this.view_canvas.clientHeight*100)
                // this.state.view_port.x = Math.max(0, this.state.view_port.x+deltaX/ this.view_canvas.clientWidth*100)
            }
            this.dirty = true


            
        });
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
