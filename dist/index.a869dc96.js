var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},t={},n={},o=e.parcelRequireafd0;null==o&&((o=function(e){if(e in t)return t[e].exports;if(e in n){var o=n[e];delete n[e];var i={id:e,exports:{}};return t[e]=i,o.call(i.exports,i,i.exports),i.exports}var a=new Error("Cannot find module '"+e+"'");throw a.code="MODULE_NOT_FOUND",a}).register=function(e,t){n[e]=t},e.parcelRequireafd0=o);var i=o("ilwiq"),a=o("5Rd1x"),r=o("fUhpq"),s=o("jiuw3"),d=o("7MGRS"),l=o("6yEsn"),c=o("4CEV9"),u=o("7coGQ");const p={solve:!0,displayMesh:!0,displayIk:!0,displayGoals:!0,displayShadows:!0,model:"ATHLETE",webworker:!0},w={useSVD:!1,maxIterations:3,divergeThreshold:.05,stallThreshold:1e-4,translationErrorClamp:.25,rotationErrorClamp:.25,translationConvergeThreshold:.001,rotationConvergeThreshold:1e-5,restPoseFactor:.025},h=new Map,m=new Map,f=[],g=[];let v,S,b,y,E,x,C,T,k,M,L,R,q,W,G,H=-1,P=0,A=0,F=0,B=new i.Vector2;const I=new i.Box3,O=new i.Sphere,j=new i.Vector3;function U(){if(v&&v.destroy(),!L)return;v=new s.GUI,v.width=350,v.add(p,"model",["ATHLETE","Robonaut","Curiosity","Staubli"]).onChange((e=>{let t=null;switch(e){case"ATHLETE":t=u.loadATHLETE();break;case"Robonaut":t=u.loadRobonaut();break;case"Curiosity":t=u.loadCuriosity();break;case"Staubli":t=u.loadStaubli()}D(t)})),v.add(p,"displayMesh").name("display mesh"),v.add(p,"displayGoals").name("display goals"),v.add(p,"displayIk").name("display ik chains"),v.add(p,"displayShadows").name("shadows"),v.add(p,"webworker").onChange((e=>{e?T=new c.WorkerSolver(T.roots):(T.dispose(),T=new c.Solver(T.roots))})),v.add({reset:()=>{let e=null;switch(p.model){case"ATHLETE":e=u.loadATHLETE();break;case"Robonaut":e=u.loadRobonaut();break;case"Curiosity":e=u.loadCuriosity();break;case"Staubli":e=u.loadStaubli()}D(e)}},"reset");const e=v.addFolder("solver");e.add(p,"solve").onChange((e=>{!e&&T instanceof c.WorkerSolver&&T.stop()})),e.add(w,"useSVD"),e.add(w,"maxIterations").min(1).max(10).step(1).listen(),e.add(w,"divergeThreshold").min(0).max(.5).step(.01).listen(),e.add(w,"stallThreshold").min(0).max(.01).step(1e-4).listen(),e.add(w,"translationErrorClamp").min(.01).max(1).listen(),e.add(w,"rotationErrorClamp").min(.01).max(1).listen(),e.add(w,"translationConvergeThreshold").min(.001).max(.1).listen(),e.add(w,"rotationConvergeThreshold").min(1e-5).max(.01).listen(),e.add(w,"restPoseFactor").min(0).max(.25).step(.01).listen(),e.open()}function V(e){if(e.geometry&&e.geometry.dispose(),e.material){function t(e){e.dispose();for(const t in e)e[t]&&e[t].isTexture&&e[t].dispose()}Array.isArray(e.material)?e.material.forEach(t):t(e.material)}}function D(e){R&&(R.traverse(V),M.traverse(V),k.traverse(V),E.remove(R,M,k)),L=null,R=null,k=null,M=null,f.length=0,h.clear(),m.clear(),H=-1,P++;const t=P;e.then((({goalMap:e,urdf:n,ik:o,helperScale:i=1})=>{if(P!==t)return;o.updateMatrixWorld(!0),k=new c.IKRootsHelper(o),k.setJointScale(i),k.setResolution(window.innerWidth,window.innerHeight),k.color.set(15277667).convertSRGBToLinear(),k.setColor(k.color),M=new c.IKRootsHelper(o),M.setJointScale(i),M.setResolution(window.innerWidth,window.innerHeight),M.color.set(15277667).convertSRGBToLinear(),M.setColor(M.color),M.setDrawThrough(!0),n.traverse((e=>{e.castShadow=!0,e.receiveShadow=!0})),E.add(n,k,M);const a=[];e.forEach(((e,t)=>{a.push(t),h.set(t,e),m.set(e,t)})),T=p.webworker?new c.WorkerSolver(o):new c.Solver(o),T.maxIterations=3,T.translationErrorClamp=.25,T.rotationErrorClamp=.25,T.restPoseFactor=.01,T.divergeThreshold=.05,a.length?(G.position.set(...a[0].position),G.quaternion.set(...a[0].quaternion),H=0):H=-1,a.forEach((e=>{e.originalPosition=[0,0,0],e.originalQuaternion=[0,0,0,1]})),L=o,R=n,f.push(...a),U()}))}!function(){S=new d.default,document.body.appendChild(S.dom),b=document.getElementById("output"),y=new i.WebGLRenderer({antialias:!0}),y.setPixelRatio(window.devicePixelRatio),y.setSize(window.innerWidth,window.innerHeight),y.shadowMap.enabled=!0,y.shadowMap.type=i.PCFSoftShadowMap,y.outputEncoding=i.sRGBEncoding,document.body.appendChild(y.domElement),x=new i.PerspectiveCamera(50,window.innerWidth/window.innerHeight),x.position.set(8,8,8),E=new i.Scene,E.background=new i.Color(1250841),C=new i.DirectionalLight,C.position.set(1,3,2),C.castShadow=!0,C.shadow.mapSize.setScalar(2048),E.add(C,C.target);const e=new i.AmbientLight(2503224,1);function t(e){const t=f.indexOf(e),n=f[t];n.traverse((e=>{e.isClosure&&e.removeChild(e.child)})),f.splice(t,1);const o=h.get(n);h.delete(n),m.delete(o),T.updateStructure(),k.updateStructure(),M.updateStructure()}E.add(e),q=new a.OrbitControls(x,y.domElement),W=new r.TransformControls(x,y.domElement),W.setSpace("local"),E.add(W),W.addEventListener("mouseDown",(()=>q.enabled=!1)),W.addEventListener("mouseUp",(()=>q.enabled=!0)),G=new i.Group,G.position.set(0,1,1),E.add(G),W.attach(G),window.addEventListener("resize",(()=>{const e=window.innerWidth,t=window.innerHeight,n=e/t;y.setSize(e,t),x.aspect=n,x.updateProjectionMatrix(),k&&(k.setResolution(window.innerWidth,window.innerHeight),M.setResolution(window.innerWidth,window.innerHeight))})),window.addEventListener("keydown",(e=>{switch(e.key){case"w":W.setMode("translate");break;case"e":W.setMode("rotate");break;case"q":W.setSpace("local"===W.space?"world":"local");break;case"f":q.target.set(0,0,0),q.update()}})),W.addEventListener("mouseUp",(()=>{if(-1!==H){const e=f[H],t=h.get(e);t&&(t.updateMatrixWorld(),t.attachChild(e),e.setPosition(...e.originalPosition),e.setQuaternion(...e.originalQuaternion),t.detachChild(e),G.position.set(...e.position),G.quaternion.set(...e.quaternion))}})),y.domElement.addEventListener("pointerdown",(e=>{B.x=e.clientX,B.y=e.clientY})),y.domElement.addEventListener("pointerup",(e=>{if(Math.abs(e.clientX-B.x)>3||Math.abs(e.clientY-B.y)>3)return;if(!R)return;const{ikLink:n,result:o}=function(e){const t=new i.Raycaster,n=new i.Vector2;let o;n.x=e.clientX/window.innerWidth*2-1,n.y=-e.clientY/window.innerHeight*2+1,t.setFromCamera(n,x);const a=[...g];if(a.length=f.length,o=t.intersectObjects(a,!0),0!==o.length)return{ikLink:null,result:o[0]};if(o=t.intersectObjects([R],!0),0===o.length)return{ikLink:null,result:null};const r=o[0];let s=null,d=null;return r.object.traverseAncestors((e=>{null===s&&e.isURDFLink&&(s=e,L.traverse((e=>{e.name===s.name&&(d=e)})))})),{ikLink:d,result:r}}(e);if(null===n&&(H=-1),2===e.button){if(!n)return;if(m.has(n)){t(m.get(n))}const e=new i.Vector4;e.copy(o.face.normal),e.w=0,e.applyMatrix4(o.object.matrixWorld);const a=l.mat4.create(),r=[0,0,0],s=e.toArray();let d=[0,1,0];Math.abs(s[1])>.9&&(d=[0,0,1]),l.mat4.targetTo(a,r,s,d);const u=new c.Joint;u.name="GoalRootJoint-"+n.name,u.setPosition(o.point.x,o.point.y,o.point.z),l.mat4.getRotation(u.quaternion,a);const p=new c.Link;u.addChild(p);const w=new c.Joint;u.name="GoalJoint-"+n.name,n.getWorldPosition(w.position),n.getWorldQuaternion(w.quaternion),w.setMatrixNeedsUpdate(),p.attachChild(w),w.makeClosure(n),n.attachChild(u),u.originalPosition=u.position.slice(),u.originalQuaternion=u.quaternion.slice(),n.detachChild(u),T.updateStructure(),k.updateStructure(),M.updateStructure(),G.position.set(...u.position),G.quaternion.set(...u.quaternion),h.set(u,n),m.set(n,u),f.push(u),H=f.length-1}else if(0===e.button&&!W.dragging)if(H=g.indexOf(o?o.object.parent:null),-1!==H){const e=f[H];G.position.set(...e.position),G.quaternion.set(...e.quaternion)}else if(n&&m.has(n)){const e=m.get(n);H=f.indexOf(e),G.position.set(...e.position),G.quaternion.set(...e.quaternion)}})),window.addEventListener("keydown",(e=>{-1===H||"Delete"!==e.code&&"Backspace"!==e.code||(t(f[H]),H=-1)}))}(),U(),D(u.loadATHLETE()),function e(){requestAnimationFrame(e);const t=f,n=t[H];if(L){if(n&&(n.setPosition(G.position.x,G.position.y,G.position.z),n.setQuaternion(G.quaternion.x,G.quaternion.y,G.quaternion.z,G.quaternion.w)),p.solve){const a=window.performance.now();let r;T instanceof c.WorkerSolver?(T.updateFrameState(...t),T.updateSolverSettings(w),r=T.status,T.running||T.solve()):(Object.assign(T,w),r=T.solve());const s=window.performance.now()-a;b.innerText=`solve time \t: ${s.toFixed(3)}ms\n`,F<50&&F++,A+=(s-A)/F,b.innerText+=`avg solve time \t: ${A.toFixed(3)}ms\n`,b.innerText+=r.map((e=>c.SOLVE_STATUS_NAMES[e])).join("\n"),c.setUrdfFromIK(R,L)}R.visible=p.displayMesh,!p.displayIk&&k.parent?(E.remove(k),E.remove(M)):p.displayIk&&!k.parent&&(E.add(k),E.add(M))}for(;g.length<t.length;){const d=new i.Color(16763432).convertSRGBToLinear(),l=new i.Group,u=new i.Mesh(new i.SphereBufferGeometry(.05,30,30),new i.MeshBasicMaterial({color:d})),h=new i.Mesh(new i.SphereBufferGeometry(.05,30,30),new i.MeshBasicMaterial({color:d,opacity:.4,transparent:!0,depthWrite:!1,depthTest:!1})),m=u.updateMatrix;function o(...e){this.scale.setScalar(.15*this.position.distanceTo(x.position)),m.call(this,...e)}u.updateMatrix=o,h.updateMatrix=o,l.add(u,h),E.add(l),g.push(l)}if(g.forEach((e=>e.visible=!1)),t.forEach(((e,t)=>{g[t].position.set(...e.position),g[t].quaternion.set(...e.quaternion),g[t].visible=p.displayGoals})),W.enabled=-1!==H,W.visible=-1!==H,null!==R){I.setFromObject(R).getBoundingSphere(O),j.subVectors(C.position,C.target.position),C.target.position.copy(O.center);const v=C.shadow.camera;v.left=v.bottom=-O.radius,v.right=v.top=O.radius,v.near=0,v.far=2*O.radius,v.updateProjectionMatrix(),j.normalize().multiplyScalar(O.radius),C.position.addVectors(O.center,j)}C.castShadow=p.displayShadows,y.render(E,x),S.update()}();
//# sourceMappingURL=index.a869dc96.js.map
