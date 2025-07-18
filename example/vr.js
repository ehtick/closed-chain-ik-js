import {
	WebGLRenderer,
	PerspectiveCamera,
	Color,
	Scene,
	DirectionalLight,
	AmbientLight,
	Group,
	Raycaster,
	Vector4,
	Mesh,
	SphereGeometry,
	MeshBasicMaterial,
	TorusGeometry,
	BufferGeometry,
	Float32BufferAttribute,
	LineBasicMaterial,
	AdditiveBlending,
	Line,
	RingGeometry,
	PCFSoftShadowMap,
	Vector3,
	Quaternion,
	GridHelper,
	Box3,
	PlaneGeometry,
	ShadowMaterial,
	MeshPhongMaterial,
	BufferAttribute,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
	GUI,
} from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { mat4 } from 'gl-matrix';
import {
	Solver,
	WorkerSolver,
	Link,
	Joint,
	IKRootsHelper,
	setUrdfFromIK,
} from '../src/index.js';
import {
	loadATHLETE,
	loadRobonaut,
	loadStaubli,
	loadCuriosity,
} from './loadModels.js';
import {
	MaterialReducer
} from './lib/MaterialReducer.js';
import {
	ProxyBatchedMesh
} from './lib/ProxyBatchedMesh.js';

const params = {
	shadows: true,
	liveRaycasting: true,
	scale: 1,
	solve: true,
	displayIk: false,
	displayGoals: true,
	model: window.location.hash.replace( /^#/, '' ).trim() || 'ATHLETE',
	webworker: true,
};

const solverOptions = {
	useSVD: false,
	maxIterations: 3,
	divergeThreshold: 0.05,
	stallThreshold: 1e-4,
	translationErrorClamp: 0.25,
	rotationErrorClamp: 0.25,
	translationConvergeThreshold: 1e-3,
	rotationConvergeThreshold: 1e-5,
	restPoseFactor: 0.025,
};

const goalToLinkMap = new Map();
const linkToGoalMap = new Map();
const goals = [];
const goalIcons = [];
let selectedGoalIndex = - 1;

let loadId = 0;
let gui;
let renderer, scene, camera, workspace, controller, controllerGrip, ground, directionalLight;
let intersectRing, hitSphere, targetObject;
let solver, ikHelper, drawThroughIkHelper, ikRoot, urdfRoot, urdfProxy;
let marsModel;
const tempPos = new Vector3();
const tempQuat = new Quaternion();
const raycaster = new Raycaster();

init();
rebuildGUI();
loadModelByName( params.model );

function init() {

	// init renderer
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;
	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	scene.background = new Color( 0x131619 );

	workspace = new Group();
	workspace.position.z = 3;
	scene.add( workspace );

	camera = new PerspectiveCamera( 50, window.innerWidth / window.innerHeight );
	workspace.add( camera );

	directionalLight = new DirectionalLight( 0xffffff, 3 );
	directionalLight.position.set( 5, 30, 15 );
	directionalLight.castShadow = true;
	directionalLight.shadow.mapSize.set( 2048, 2048 );
	scene.add( directionalLight );

	const ambientLight = new AmbientLight( 0x263238, 3 );
	scene.add( ambientLight );

	const grid = new GridHelper( 10, 10, 0xffffff, 0xffffff );
	grid.material.transparent = true;
	grid.material.opacity = 0.1;
	grid.material.depthWrite = false;
	scene.add( grid );

	ground = new Mesh(
		new PlaneGeometry(),
		new ShadowMaterial( {

			color: 0,
			opacity: 0.25,
			transparent: true,
			depthWrite: false,

		} ),
	);
	ground.receiveShadow = true;
	ground.scale.setScalar( 30 );
	ground.rotation.x = - Math.PI / 2;
	ground.renderOrder = 1;
	scene.add( ground );

	targetObject = new Group();
	targetObject.position.set( 0, 1, 1 );
	scene.add( targetObject );

	window.addEventListener( 'resize', onResize );

	marsModel = new Group();
	marsModel.rotation.set( 0, - Math.PI / 2, 0 );
	marsModel.position.set( 0.5, 0, 2.35 );
	scene.add( marsModel );

	new GLTFLoader().load( 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/mars-site/scene.gltf', gltf => {

		const marsScene = gltf.scene;
		marsScene.scale.setScalar( 0.01 );
		marsScene.updateMatrixWorld( true );

		const box = new Box3();
		box.setFromObject( marsScene );

		marsScene.position.y = - box.min.y;

		marsModel.add( marsScene );

	} );

	// widgets
	const whiteMat = new MeshBasicMaterial( { color: 0xffffff } );
	intersectRing = new Mesh( new TorusGeometry( 0.25, 0.02, 16, 100 ), whiteMat );
	intersectRing.rotation.x = Math.PI / 2;
	intersectRing.visible = false;
	scene.add( intersectRing );

	hitSphere = new Mesh( new SphereGeometry( 0.005, 50, 50 ), whiteMat );
	scene.add( hitSphere );

	// vr
	renderer.xr.enabled = true;
	renderer.setAnimationLoop( render );
	document.body.appendChild( VRButton.createButton( renderer ) );

	// vr controllers
	controller = renderer.xr.getController( 0 );
	controller.addEventListener( 'connected', function ( event ) {

		this.add( buildController( event.data ) );

	} );
	controller.addEventListener( 'disconnected', function () {

		this.remove( this.children[ 0 ] );

	} );
	workspace.add( controller );

	const startPos = new Vector3();
	const endPos = new Vector3();
	let startTime = - 1;
	controller.addEventListener( 'selectend', () => {

		if ( selectedGoalIndex !== - 1 ) {

			const goal = goals[ selectedGoalIndex ];
			const ikLink = goalToLinkMap.get( goal );
			if ( ikLink ) {

				ikLink.updateMatrixWorld();

				ikLink.attachChild( goal );
				goal.setPosition( ...goal.originalPosition );
				goal.setQuaternion( ...goal.originalQuaternion );
				ikLink.detachChild( goal );

				targetObject.position.set( ...goal.position );
				targetObject.quaternion.set( ...goal.quaternion );

			}

			endPos.set( ...goal.position );
			if ( startPos.distanceTo( endPos ) < 1e-2 / params.scale && window.performance.now() - startTime < 500.0 ) {

				deleteGoal( goal );

			}

			controller.remove( targetObject );
			selectedGoalIndex = - 1;

		}

	} );

	controller.addEventListener( 'selectstart', () => {

		if ( ! urdfRoot ) return;

		const { ikLink, result } = raycast();

		startPos.setScalar( Infinity );
		if ( ikLink === null ) {

			let goalIndex = - 1;
			if ( result ) {

				goalIndex = goalIcons.indexOf( result.object.parent );

			}

			selectedGoalIndex = goalIndex;

			if ( goalIndex !== - 1 ) {

				const goal = goals[ goalIndex ];
				targetObject.position.set( ...goal.position );
				targetObject.quaternion.set( ...goal.quaternion );
				controller.attach( targetObject );

				startPos.set( ...goal.position );
				startTime = window.performance.now();

			} else if ( goalIndex === - 1 && intersectRing.visible ) {

				workspace.position
					.copy( intersectRing.position )
					.addScaledVector( controller.position, - 1.0 / params.scale );
				workspace.position.y = 0;

			}

			return;

		}

		if ( linkToGoalMap.has( ikLink ) ) {

			const goal = linkToGoalMap.get( ikLink );
			deleteGoal( goal );

		}

		// normal in world space
		const norm4 = new Vector4();
		norm4.copy( result.face.normal );
		norm4.w = 0;
		norm4.applyMatrix4( result.object.matrixWorld );

		// create look matrix
		const lookMat = mat4.create();
		const eyeVec = [ 0, 0, 0 ];
		const posVec = norm4.toArray();
		let upVec = [ 0, 1, 0 ];
		if ( Math.abs( posVec[ 1 ] ) > 0.9 ) {

			upVec = [ 0, 0, 1 ];

		}

		mat4.targetTo( lookMat, eyeVec, posVec, upVec );

		// The joint that's positioned at the surface of the mesh
		const rootGoalJoint = new Joint();
		rootGoalJoint.name = 'GoalRootJoint-' + ikLink.name;
		rootGoalJoint.setPosition(
			result.point.x,
			result.point.y,
			result.point.z,
		);
		mat4.getRotation( rootGoalJoint.quaternion, lookMat );

		const goalLink = new Link();
		rootGoalJoint.addChild( goalLink );

		const goalJoint = new Joint();
		rootGoalJoint.name = 'GoalJoint-' + ikLink.name;
		ikLink.getWorldPosition( goalJoint.position );
		ikLink.getWorldQuaternion( goalJoint.quaternion );
		goalJoint.setMatrixNeedsUpdate();

		goalLink.attachChild( goalJoint );
		goalJoint.makeClosure( ikLink );

		// save the relative position
		ikLink.attachChild( rootGoalJoint );
		rootGoalJoint.originalPosition = rootGoalJoint.position.slice();
		rootGoalJoint.originalQuaternion = rootGoalJoint.quaternion.slice();
		ikLink.detachChild( rootGoalJoint );

		// update the solver
		solver.updateStructure();
		ikHelper.updateStructure();
		drawThroughIkHelper.updateStructure();

		targetObject.position.set( ...rootGoalJoint.position );
		targetObject.quaternion.set( ...rootGoalJoint.quaternion );
		controller.attach( targetObject );

		goalToLinkMap.set( rootGoalJoint, ikLink );
		linkToGoalMap.set( ikLink, rootGoalJoint );
		goals.push( rootGoalJoint );
		selectedGoalIndex = goals.length - 1;

	} );

	const controllerModelFactory = new XRControllerModelFactory();
	controllerGrip = renderer.xr.getControllerGrip( 0 );
	controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
	workspace.add( controllerGrip );

}

function deleteGoal( goal ) {

	const index = goals.indexOf( goal );
	const goalToRemove = goals[ index ];
	goalToRemove.traverse( c => {

		if ( c.isClosure ) {

			c.removeChild( c.child );

		}

	} );

	goals.splice( index, 1 );

	const link = goalToLinkMap.get( goalToRemove );
	goalToLinkMap.delete( goalToRemove );
	linkToGoalMap.delete( link );

	solver.updateStructure();
	ikHelper.updateStructure();
	drawThroughIkHelper.updateStructure();

}

function onResize() {

	const w = window.innerWidth;
	const h = window.innerHeight;
	const aspect = w / h;

	renderer.setSize( w, h );

	camera.aspect = aspect;
	camera.updateProjectionMatrix();

}

function buildController( data ) {

	let geometry, material;

	switch ( data.targetRayMode ) {

		case 'tracked-pointer':

			geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
			geometry.setAttribute( 'color', new Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

			material = new LineBasicMaterial( {
				vertexColors: true,
				blending: AdditiveBlending,
				depthWrite: false,
				transparent: true,
			} );

			return new Line( geometry, material );

		case 'gaze':

			geometry = new RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
			material = new MeshBasicMaterial( { opacity: 0.5, transparent: true } );
			return new Mesh( geometry, material );

	}

}

function raycast( justGoals = false ) {

	controller.updateMatrixWorld();
	raycaster.ray.origin.set( 0, 0, 0 ).applyMatrix4( controller.matrixWorld );
	raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( controller.matrixWorld );

	let results;
	const intersectGoals = [ ...goalIcons ];
	intersectGoals.length = intersectGoals.length < goals.length ? intersectGoals.length : goals.length;

	results = raycaster.intersectObjects( intersectGoals, true );
	if ( results.length !== 0 ) {

		return { ikLink: null, result: results[ 0 ] };

	}

	if ( justGoals ) {

		return { ikLink: null, result: null };

	}

	results = raycaster.intersectObjects( [ urdfRoot ], true );
	if ( results.length === 0 ) {

		return { ikLink: null, result: null };

	}

	const result = results[ 0 ];

	let nearestLink = null;
	let ikLink = null;
	result.object.traverseAncestors( p => {

		if ( nearestLink === null && p.isURDFLink ) {

			nearestLink = p;
			ikRoot.traverse( c => {

				if ( c.name === nearestLink.name ) {

					ikLink = c;

				}

			} );

		}

	} );

	return { ikLink, result };

}

function render() {

	const allGoals = goals;
	const selectedGoal = allGoals[ selectedGoalIndex ];
	if ( ikRoot ) {

		intersectRing.visible = false;
		hitSphere.visible = false;
		if ( selectedGoal ) {

			targetObject.getWorldPosition( tempPos );
			targetObject.getWorldQuaternion( tempQuat );

			selectedGoal.setPosition( tempPos.x, tempPos.y, tempPos.z );
			selectedGoal.setQuaternion( tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w );

		} else {

			const { result } = raycast( ! params.liveRaycasting );
			const lineRay = controller.children[ 0 ];
			if ( lineRay ) {

				lineRay.scale.setScalar( 1, 1, 1 );

			}

			if ( result === null ) {

				raycaster.ray.origin.set( 0, 0, 0 ).applyMatrix4( controller.matrixWorld );
				raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( controller.matrixWorld );
				const hit = raycaster.intersectObject( ground )[ 0 ];
				if ( hit ) {

					intersectRing.visible = true;
					intersectRing.position.copy( hit.point );

				}

			} else {

				if ( lineRay ) {

					lineRay.scale.setScalar( result.distance * params.scale );

				}

				hitSphere.position.copy( result.point );
				hitSphere.visible = true;

			}

		}

		if ( params.solve ) {

			if ( solver instanceof WorkerSolver ) {

				solver.updateFrameState( ...allGoals );
				solver.updateSolverSettings( solverOptions );

				if ( ! solver.running ) {

					solver.solve();

				}

			} else {

				Object.assign( solver, solverOptions );
				solver.solve();

			}

			setUrdfFromIK( urdfRoot, ikRoot );

		}

		// IKHelpers can have a lot of matrices to update so remove it from
		// the scene when not in use for performance.
		if ( ! params.displayIk && ikHelper.parent ) {

			scene.remove( ikHelper );
			scene.remove( drawThroughIkHelper );

		} else if ( params.displayIk && ! ikHelper.parent ) {

			scene.add( ikHelper );
			scene.add( drawThroughIkHelper );

		}

	}

	while ( goalIcons.length < allGoals.length ) {

		const color = new Color( 0xffca28 );
		const group = new Group();
		const mesh = new Mesh(
			new SphereGeometry( 0.01, 30, 30 ),
			new MeshBasicMaterial( { color } ),
		);
		const mesh2 = new Mesh(
			new SphereGeometry( 0.01, 30, 30 ),
			new MeshBasicMaterial( {
				color,
				opacity: 0.4,
				transparent: true,
				depthWrite: false,
				depthTest: false,
			} ),
		);

		group.add( mesh, mesh2 );
		scene.add( group );
		goalIcons.push( group );

	}

	goalIcons.forEach( g => {

		g.visible = false;
		g.scale.setScalar( 1 / params.scale );

	} );
	allGoals.forEach( ( g, i ) => {

		goalIcons[ i ].position.set( ...g.position );
		goalIcons[ i ].quaternion.set( ...g.quaternion );
		goalIcons[ i ].visible = params.displayGoals;

	} );

	intersectRing.scale.setScalar( 1 / params.scale );
	hitSphere.scale.setScalar( 1 / params.scale );
	workspace.scale.setScalar( 1 / params.scale );

	directionalLight.castShadow = params.shadows;
	renderer.render( scene, camera );

}

function loadModelByName( name ) {

	let promise = null;
	marsModel.visible = false;
	switch ( name ) {

		case 'Robonaut':
			promise = loadRobonaut();
			break;

		case 'Curiosity':
			promise = loadCuriosity();
			marsModel.visible = true;
			break;

		case 'Staubli':
			promise = loadStaubli();
			break;

		case 'ATHLETE':
		default:
			promise = loadATHLETE();
			break;

	}

	loadModel( promise );

}

function rebuildGUI() {

	if ( gui ) {

		gui.destroy();

	}

	if ( ! ikRoot ) return;

	gui = new GUI();
	gui.width = 350;

	gui.add( params, 'model', [ 'ATHLETE', 'Robonaut', 'Curiosity', 'Staubli' ] ).onChange( value => {

		loadModelByName( value );

	} );
	gui.add( params, 'scale', 0.1, 4, 0.01 );
	gui.add( params, 'shadows' );
	gui.add( params, 'liveRaycasting' );
	gui.add( params, 'displayGoals' ).name( 'display goals' );
	gui.add( params, 'displayIk' ).name( 'display ik chains' );
	gui.add( params, 'webworker' ).onChange( v => {

		if ( v ) {

			solver = new WorkerSolver( solver.roots );

		} else {

			solver.dispose();
			solver = new Solver( solver.roots );

		}

	} );
	gui.add( { reset: () => {

		let promise = null;
		switch ( params.model ) {

			case 'ATHLETE':
				promise = loadATHLETE();
				break;

			case 'Robonaut':
				promise = loadRobonaut();
				break;

			case 'Curiosity':
				promise = loadCuriosity();
				break;

			case 'Staubli':
				promise = loadStaubli();
				break;

		}

		loadModel( promise );

	} }, 'reset' );

	const solveFolder = gui.addFolder( 'solver' );
	solveFolder.add( params, 'solve' ).onChange( v => {

		if ( ! v && solver instanceof WorkerSolver ) {

			solver.stop();

		}

	} );

	solveFolder.add( solverOptions, 'useSVD' );
	solveFolder.add( solverOptions, 'maxIterations' ).min( 1 ).max( 10 ).step( 1 ).listen();
	solveFolder.add( solverOptions, 'divergeThreshold' ).min( 0 ).max( 0.5 ).step( 1e-2 ).listen();
	solveFolder.add( solverOptions, 'stallThreshold' ).min( 0 ).max( 0.01 ).step( 1e-4 ).listen();
	solveFolder.add( solverOptions, 'translationErrorClamp' ).min( 1e-2 ).max( 1 ).listen();
	solveFolder.add( solverOptions, 'rotationErrorClamp' ).min( 1e-2 ).max( 1 ).listen();
	solveFolder.add( solverOptions, 'translationConvergeThreshold' ).min( 1e-3 ).max( 1e-1 ).listen();
	solveFolder.add( solverOptions, 'rotationConvergeThreshold' ).min( 1e-5 ).max( 1e-2 ).listen();
	solveFolder.add( solverOptions, 'restPoseFactor' ).min( 0 ).max( 0.25 ).step( 1e-2 ).listen();
	solveFolder.open();

}

function dispose( c ) {

	if ( c.geometry ) {

		c.geometry.dispose();

	}

	if ( c.material ) {

		function disposeMaterial( material ) {

			material.dispose();
			for ( const key in material ) {

				if ( material[ key ] && material[ key ].isTexture ) {

					material[ key ].dispose();

				}

			}

		}

		if ( Array.isArray( c.material ) ) {

			c.material.forEach( disposeMaterial );

		} else {

			disposeMaterial( c.material );

		}


	}

}

function loadModel( promise ) {

	if ( urdfRoot ) {

		urdfRoot.traverse( dispose );
		drawThroughIkHelper.traverse( dispose );
		ikHelper.traverse( dispose );
		urdfProxy.traverse( dispose );

		scene.remove( urdfRoot, drawThroughIkHelper, ikHelper, urdfProxy );

	}

	ikRoot = null;
	urdfRoot = null;
	ikHelper = null;
	drawThroughIkHelper = null;
	goals.length = 0;
	goalToLinkMap.clear();
	linkToGoalMap.clear();
	selectedGoalIndex = - 1;

	loadId ++;
	const thisLoadId = loadId;
	promise
		.then( ( { goalMap, urdf, ik, helperScale = 1 } ) => {

			if ( loadId !== thisLoadId ) {

				return;

			}

			urdf.traverse( c => {

				c.castShadow = true;
				c.receiveShadow = true;

				if ( c.material ) {

					function matToPhong( m ) {

						return new MeshPhongMaterial( {
							map: m.map,
							color: m.color,
							normalMap: m.normalMap,
							normalMapType: m.normalMapType,
						} );

					}

					if ( Array.isArray( c.material ) ) {

						c.material = c.material.map( matToPhong );

					} else {

						c.material = matToPhong( c.material );

					}

				}

			} );

			// remove redundant materials and textures
			const reducer = new MaterialReducer();
			reducer.process( urdf );

			urdf.traverse( c => {

				if ( c.isMesh ) {

					c.geometry.deleteAttribute( 'color' );
					if ( c.geometry.index ) {

						c.geometry.toNonIndexed();

					}

					if ( c.geometry.attributes.uv && ! c.material.map ) {

						c.geometry.deleteAttribute( 'uv' );

					} else if ( ! c.geometry.attributes.uv && c.material.map ) {

						const count = c.geometry.attributes.position.count;
						c.geometry.setAttribute(
							'uv',
							new BufferAttribute(
								new Float32Array( count * 2 ),
								2,
								false,
							),
						);

					}

				}

			} );
			urdfProxy = new ProxyBatchedMesh( urdf );
			urdfProxy.children.forEach( sm => {

				sm.castShadow = true;
				sm.receiveShadow = true;
				sm.material.skinning = true;

			} );

			setUrdfFromIK( urdf, ik );

			const box = new Box3();
			urdf.updateMatrixWorld( true );
			box.setFromObject( urdf );
			urdf.position.y -= box.min.y;
			ik.position[ 1 ] -= box.min.y;
			ik.setMatrixNeedsUpdate();


			goalMap.forEach( ( link, goal ) => {

				goal.position[ 1 ] -= box.min.y;
				goal.setMatrixNeedsUpdate();

			} );

			ik.updateMatrixWorld( true );

			// create the helper
			ikHelper = new IKRootsHelper( ik );
			ikHelper.setJointScale( helperScale );
			ikHelper.setColor( 0xe91e63 );

			drawThroughIkHelper = new IKRootsHelper( ik );
			drawThroughIkHelper.setJointScale( helperScale );
			drawThroughIkHelper.setColor( 0xe91e63 );
			drawThroughIkHelper.setDrawThrough( true );

			scene.add( urdfProxy, ikHelper, drawThroughIkHelper );

			const loadedGoals = [];
			goalMap.forEach( ( link, goal ) => {

				loadedGoals.push( goal );
				goalToLinkMap.set( goal, link );
				linkToGoalMap.set( link, goal );

			} );

			solver = params.webworker ? new WorkerSolver( ik ) : new Solver( ik );

			selectedGoalIndex = - 1;

			loadedGoals.forEach( g => {

				g.originalPosition = [ 0, 0, 0 ];
				g.originalQuaternion = [ 0, 0, 0, 1 ];

			} );

			ikRoot = ik;
			urdfRoot = urdf;
			goals.push( ...loadedGoals );

			rebuildGUI();

		} );

}
