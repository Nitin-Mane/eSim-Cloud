import { Utils } from './Utils';
import { Wire } from './Wire';
import { ArduinoUno } from './Arduino';

declare var window;
declare var $; // For Jquery

export class Workspace {
  // TODO: Add Comments
  static translateX = 0.0;
  static translateY = 0.0;
  static scale = 1.0;
  static zooomIncrement = 0.01;
  static translateRate = 0.25;
  static moveCanvas = {
    x: 0,
    y: 0,
    start: false
  };
  static copiedItem: any;
  static zoomIn() {
    Workspace.scale = Math.min(10, Workspace.scale + Workspace.zooomIncrement);
    Workspace.scale = Math.min(10, Workspace.scale + Workspace.zooomIncrement);
    const ele = (window['canvas'].canvas as HTMLElement);
    ele.setAttribute('transform', `scale(
      ${Workspace.scale},
      ${Workspace.scale})
      translate(${Workspace.translateX},
      ${Workspace.translateY})`);
  }

  static zoomOut() {
    Workspace.scale = Math.max(0.1, Workspace.scale - Workspace.zooomIncrement);
    Workspace.scale = Math.max(0.1, Workspace.scale - Workspace.zooomIncrement);
    const ele = (window['canvas'].canvas as HTMLElement);
    ele.setAttribute('transform', `scale(
      ${Workspace.scale},
      ${Workspace.scale})
      translate(${Workspace.translateX},
      ${Workspace.translateY})`);
  }

  static minMax(min: number, max: number, value: number) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  static initalizeGlobalVariables(canvas: any) {
    window['canvas'] = canvas;
    window['test'] = Workspace.zoomIn;
    window['holder'] = document.getElementById('holder').getBoundingClientRect();
    window['holder_svg'] = document.querySelector('#holder > svg');
    window['ArduinoUno_name'] = {};
    // Stores all the Circuit Information
    window['scope'] = {
      wires: []
    };
    for (const key in Utils.components) {
      if (window['scope'][key] === null || window['scope'][key] === undefined) {
        window['scope'][key] = [];
      }
    }
    // True when simulation takes place
    window['isSimulating'] = false;
    // Stores the reference to the selected circuit component
    window['Selected'] = null;
    // True when a component is selected
    window['isSelected'] = false;
    // Intialize a variable for Property Box
    window['property_box'] = {
      x: 0,
      y: 0,
      element: document.getElementById('propertybox'),
      title: document.querySelector('#propertybox .title'),
      body: document.querySelector('#propertybox .body'),
      mousedown: false
    };
  }

  static initProperty(toggle) {
    // Global Function to Show Properties of Circuit Component
    window['showProperty'] = (callback: any) => {
      const data = callback();
      window['property_box'].element.setAttribute('key', data.keyName);
      window['property_box'].title.innerText = data.title;
      window['property_box'].body.innerHTML = '';
      window['property_box'].body.appendChild(data.body);
      toggle(false);
    };
    // Global Function to Hide Properties of Circuit Component
    window['hideProperties'] = () => {
      if (window.Selected && window.Selected.deselect) {
        window.Selected.deselect();
      }
      window['Selected'] = null;
      window['isSelected'] = false;
      window['property_box'].body.innerHTML = '';
      window['property_box'].title.innerText = 'Project Info';
      toggle(true);
    };
  }

  static initializeGlobalFunctions() {
    // Global Function to show Popup Bubble
    window['showBubble'] = (label: string, x: number, y: number) => {
      // id label is empty don't show anything
      if (label === '') { return; }
      const ele = document.getElementById('bubblebox');
      ele.innerText = label;
      ele.style.display = 'block';
      ele.style.top = `${y + 25}px`;
      ele.style.left = `${(x - ele.clientWidth / 2)}px`;
    };
    // Global Function to hide Popub Bubble
    window['hideBubble'] = () => {
      const ele = document.getElementById('bubblebox');
      ele.style.display = 'none';
    };
    // Global Function to show Toast Message
    window['showToast'] = (message: string) => {
      const ele = document.getElementById('ToastMessage');

      ele.style.display = 'block';
      ele.innerText = message;
      ele.style.padding = '15px 25px 15px 25px';
      setTimeout(() => {
        ele.style.display = 'none';
      }, 10000);

    };
  }
  /**
   * Event Listener for mousemove on html body
   * @param event Mouse Event
   */
  static bodyMouseMove(event: MouseEvent) {
    if (Workspace.moveCanvas.start) {
      const dx = (event.clientX - Workspace.moveCanvas.x) * Workspace.translateRate;
      const dy = (event.clientY - Workspace.moveCanvas.y) * Workspace.translateRate;
      const ele = (window['canvas'].canvas as HTMLElement);
      ele.setAttribute('transform', `scale(
        ${Workspace.scale},
        ${Workspace.scale})
        translate(${Workspace.translateX + dx},
        ${Workspace.translateY + dy})`);
    }
    if (window['property_box'].start) {
      const el = window['property_box'].element;
      el.style.left = `${Workspace.minMax(0, window.innerWidth - 220, event.clientX - window['property_box'].x)}px`;
      el.style.top = `${Workspace.minMax(0, window.innerHeight - 50, event.clientY - window['property_box'].y)}px`;
    }
  }
  /**
   * Event Listener for mouseup on html body
   * @param event Mouse Event
   */
  static bodyMouseUp(event: MouseEvent) {
    if (Workspace.moveCanvas.start) {
      const dx = (event.clientX - Workspace.moveCanvas.x) * Workspace.translateRate;
      const dy = (event.clientY - Workspace.moveCanvas.y) * Workspace.translateRate;
      Workspace.translateX += dx;
      Workspace.translateY += dy;
      Workspace.moveCanvas.start = false;
      document.getElementById('holder').classList.remove('grabbing');
    }
    window['property_box'].start = false;
  }

  static mouseDown(event: MouseEvent) {
    Workspace.hideContextMenu();
    if (window['isSelected'] && (window['Selected'] instanceof Wire)) {
      // if selected item is wire and it is not connected then add the point
      if (window.Selected.end == null) {
        const pt = Workspace.svgPoint(event.clientX, event.clientY);
        window.Selected.add(pt.x, pt.y);
        return;
      }
    }
    if ((event.target as HTMLElement).tagName === 'svg') {
      Workspace.moveCanvas = {
        x: event.clientX,
        y: event.clientY,
        start: true
      };
      document.getElementById('holder').classList.add('grabbing');
    }
  }

  static click(event: MouseEvent) {
  }

  static mouseMove(event: MouseEvent) {
    event.preventDefault();
    // if wire is selected then draw temporary lines
    if (window['isSelected'] && (window['Selected'] instanceof Wire)) {
      const pt = Workspace.svgPoint(event.clientX, event.clientY);
      window.Selected.draw(pt.x, pt.y);
    } else {
      // deselect item
      if (window.Selected && window.Selected.deselect) {
        window.Selected.deselect();
      }
    }
    Workspace.updateWires();
  }

  /*
  TODO: Remove if not Required
  static mouseEnter(event: MouseEvent) {

  }
  static mouseLeave(event: MouseEvent) {

  }

  static mouseOver(event: MouseEvent) {

  }

  static mouseOut(event: MouseEvent) {

  }*/

  static mouseUp(event: MouseEvent) {

  }

  static contextMenu(event: MouseEvent) {
    event.preventDefault();
    const element = document.getElementById('contextMenu');
    element.style.display = 'block';
    element.style.left = `${event.clientX}px`;
    element.style.top = `${event.clientY}px`;
    return true;
  }
  static hideContextMenu() {
    const element = document.getElementById('contextMenu');
    element.style.display = 'none';

  }
  static copy(event: ClipboardEvent) {
  }

  static cut(event: ClipboardEvent) {

  }

  static doubleClick(event: MouseEvent) {
    if (window['isSelected'] && (window['Selected'] instanceof Wire) && !window.Selected.isConnected()) {
      return;
    }
    if ((event.target as HTMLElement).tagName !== 'svg') {
      return;
    }
    // deselect item
    window.hideProperties();
  }

  static dragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  static dragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  static drop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const className = event.dataTransfer.getData('text'); // get the event data
    const pt = Workspace.svgPoint(event.clientX, event.clientY);
    Workspace.addComponent(className, pt.x, pt.y, 0, 0);
  }

  static keyDown(event: KeyboardEvent) {

  }
  static keyPress(event: KeyboardEvent) {

  }
  static keyUp(event: KeyboardEvent) {

  }
  static mouseWheel(event: WheelEvent) {
    event.preventDefault();
    if (event.deltaY < 0) {
      Workspace.zoomIn();
    } else {
      Workspace.zoomOut();
    }
  }
  static paste(event: ClipboardEvent) {

  }

  static addComponent(classString: string, x: number, y: number, offsetX: number, offsetY: number) {
    const myClass = Utils.components[classString].className;
    const obj = new myClass(
      window['canvas'],
      x - offsetX,
      y - offsetY
    );
    window['scope'][classString].push(obj);
  }

  static updateWires() {
    for (const z of window['scope']['wires']) {
      z.update();
    }
  }

  static svgPoint(x, y) {
    const pt = window['holder_svg'].createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(window.canvas.canvas.getScreenCTM().inverse());
  }
  static removeMeta(obj) {
    for (const prop in obj) {
      if (typeof obj[prop] === 'object') {
        obj[prop] = null;
      } else {
        delete obj[prop];
      }
    }
  }
  static DeleteComponent() {
    if (window['Selected']) {
      if (window['Selected'] instanceof ArduinoUno) {
        // TODO: Show Alert
        const ans = confirm('The Respective code will also be lost!');
        if (!ans) {
          return;
        }
      }
      const uid = window.Selected.id;
      const items = window.scope[window.Selected.keyName];
      for (let i = 0; i < items.length; ++i) {
        if (items[i].id === uid) {
          window.Selected.remove();
          window.Selected = null;
          window.isSelected = false;
          const k = items.splice(i, 1);
          Workspace.removeMeta(k[0]);
          break;
        }
      }
      window.hideProperties();
    } else {
      window['showToast']('No Element Selected');
    }
  }
  static copyComponent() {
    if (window['Selected']) {
      if (window['Selected'] instanceof Wire) {
        // TODO: Show Toast
        console.log('You Can\'t Copy Wire');
        return;
      }
      Workspace.copiedItem = window.Selected;
    } else {
      Workspace.copiedItem = null;
    }
  }
  static pasteComponent() {
    // console.log(Workspace.copiedItem);
    if (Workspace.copiedItem) {
      const ele = document.getElementById('contextMenu');
      const x = +ele.style.left.replace('px', '');
      const y = +ele.style.top.replace('px', '');
      // console.log([x, y]);
      const key = Workspace.copiedItem.keyName;
      const pt = Workspace.svgPoint(x, y);
      // Workspace.addComponent(Workspace.copiedItem, pt.x, pt.y, 0, 0);
      const myClass = Utils.components[key].className;
      const obj = new myClass(window['canvas'], pt.x, pt.y);
      window['scope'][key].push(obj);
      // obj.copy(Workspace.copiedItem)
    }
  }
}
