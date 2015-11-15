
Potree.Viewer = function(domElement, args){
	var scope = this;
	var arguments = args || {};
	var pointCloudLoadedCallback = args.onPointCloudLoaded || function(){};
	
	this.renderArea = domElement;
	

	//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
	//	defaultSettings.navigation = "Orbit";
	//}
	
	this.annotations = [];
	this.fov = 60;
	this.pointSize = 1;
	this.opacity = 1;
	this.sizeType = "Fixed";
	this.pointSizeType = null;
	this.pointColorType = null;
	this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
	this.quality = "Squares";
	this.isFlipYZ = false;
	this.useDEMCollisions = false;
	this.minNodeSize = 100;
	this.directionalLight;
	this.edlScale = 1;
	this.edlRadius = 3;
	this.useEDL = false;
	this.minimumJumpDistance = 0.2;
	this.jumpDistance = null;

	this.showDebugInfos = false;
	this.showStats = true;
	this.showBoundingBox = false;
	this.freeze = false;

	this.fpControls;
	this.orbitControls;
	this.earthControls;
	this.geoControls;
	this.controls;

	this.progressBar = new ProgressBar();

	var gui;
	
	this.renderer;
	this.camera;
	this.scene;
	this.scenePointCloud;
	this.sceneBG;
	this.cameraBG;
	this.pointclouds = [];
	this.measuringTool;
	this.volumeTool;
	this.transformationTool;
	
	var skybox;
	var stats;
	var clock = new THREE.Clock();
	this.showSkybox = false;
	this.referenceFrame;
	
	this.toLocal = (function(viewer){
		return function(position){
			var scenePos = position.clone().applyMatrix4(viewer.referenceFrame.matrixWorld);
			
			return scenePos;
		}
	})(this);
	
	
	this.toGeo = (function(viewer){
		return function(position){
			var inverse = new THREE.Matrix4().getInverse(viewer.referenceFrame.matrixWorld);
			var geoPos = position.clone().applyMatrix4(inverse);

			return geoPos;
		}
	})(this);
	
	
	this.setDescription = function(value){
		document.getElementById("description").innerHTML = value;
	};
	
	this.setNavigationMode = function(value){
		if(value === "Orbit"){
			this.useOrbitControls();
		}else if(value === "Flight"){
			this.useFPSControls();
		}else if(value === "Earth"){
			this.useEarthControls();
		}
		
		document.getElementById("optNavigation_" + value).checked = true;
	};
	
	this.setShowToolbar = function(value){
		document.getElementById("toolbar").style.display = value ? "initial" : "none";
	};
	
	this.setShowNavbar = function(value){
		document.getElementById("navbar").style.display = value ? "initial" : "none";
	};
	
	this.setShowBoundingBox = function(value){
		this.showBoundingBox = value;
		
		document.getElementById("chkShowBoundingBox").checked = value;
	};
	
	this.setShowDebugInfos = function(value){
		this.showDebugInfos = value;
		this.infos.domElement.style.display = this.showDebugInfos ? "block" : "none";
		document.getElementById("chkShowDebugInfos").checked = value;
	};
	
	this.setShowStats = function(value){
		this.showStats = value;
		
		document.getElementById("chkShowStats").checked = value;
	};
	
	this.setFreeze = function(value){
		this.freeze = value;
		
		document.getElementById("chkFreeze").checked = value;
	};
	
	this.setPointBudget = function(value){
		Potree.pointBudget = value;
		
		document.getElementById("lblPointBudget").innerHTML = (value / (1*1000*1000)).toFixed(2) + "m";
	};
	
	this.setClipMode = function(clipMode){
		this.clipMode = clipMode;
		
		if(clipMode === Potree.ClipMode.DISABLED){
			document.getElementById("optClipMode_NoClipping").checked = true;
		}else if(clipMode === Potree.ClipMode.CLIP_OUTSIDE){
			document.getElementById("optClipMode_ClipOutside").checked = true;
		}else if(clipMode === Potree.ClipMode.HIGHLIGHT_INSIDE){
			document.getElementById("optClipMode_HighlightInside").checked = true;
		}
	};
	
	this.setEDLEnabled = function(value){
		scope.useEDL = value;
		
		document.getElementById("chkEDLEnabled").checked = value;
	};
	
	this.setEDLRadius = function(value){
		scope.edlRadius = value;
		
		document.getElementById("lblEDLRadius").innerHTML = value.toFixed(2);
		$( "#sldEDLRadius" ).slider("option", "value", value);
	};
	
	this.setEDLStrength = function(value){
		scope.edlScale = value;
		
		document.getElementById("lblEDLStrength").innerHTML = value.toFixed(2);
		$( "#sldEDLStrength" ).slider("option", "value", value);
	};
	
	this.setPointSize = function(value){
		scope.pointSize = value;
		document.getElementById("lblPointSize").innerHTML = value.toFixed(2);
		$( "#sldPointSize" ).slider("option", "value", value);
	};
	
	this.setFOV = function(value){
		scope.fov = value;
		document.getElementById("lblFOV").innerHTML = parseInt(value);
		$( "#sldFOV" ).slider("option", "value", value);
	};
	
	this.setOpacity = function(value){
		scope.opacity = value;
		document.getElementById("lblOpacity").innerHTML = value.toFixed(2);
		$( "#sldOpacity" ).slider("option", "value", value);
	};

	this.setPointSizing = function(value){
		scope.sizeType = value;
		if(value === "Fixed"){
			scope.pointSizeType = Potree.PointSizeType.FIXED;
		}else if(value === "Attenuated"){
			scope.pointSizeType = Potree.PointSizeType.ATTENUATED;
		}else if(value === "Adaptive"){
			scope.pointSizeType = Potree.PointSizeType.ADAPTIVE;
		}
		
		document.getElementById("optPointSizing_" + value).checked = true;
	};

	this.setQuality = function(value){
		if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
			scope.quality = "Squares";
		}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
			scope.quality = "Squares";
		}else{
			scope.quality = value;
		}
		
		document.getElementById("optQuality_" + value).checked = true;
	};
	
	this.setClassificationVisibility = function(key, value){
		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];
			var newClass = pointcloud.material.classification;
			newClass[key].w = value ? 1 : 0;
			
			pointcloud.material.classification = newClass;
		}
		
		document.getElementById("chkClassification_" + key).checked = value;
	};

	this.setMaterial = function(value){
		this.material = value;
		if(value === "RGB"){
			scope.pointColorType = Potree.PointColorType.RGB;
		}else if(value === "Color"){
			scope.pointColorType = Potree.PointColorType.COLOR;
		}else if(value === "Elevation"){
			scope.pointColorType = Potree.PointColorType.HEIGHT;
		}else if(value === "Intensity"){
			scope.pointColorType = Potree.PointColorType.INTENSITY;
		}else if(value === "Intensity Gradient"){
			scope.pointColorType = Potree.PointColorType.INTENSITY_GRADIENT;
		}else if(value === "Classification"){
			scope.pointColorType = Potree.PointColorType.CLASSIFICATION;
		}else if(value === "Return Number"){
			scope.pointColorType = Potree.PointColorType.RETURN_NUMBER;
		}else if(value === "Source"){
			scope.pointColorType = Potree.PointColorType.SOURCE;
		}else if(value === "Tree Depth"){
			scope.pointColorType = Potree.PointColorType.TREE_DEPTH;
		}else if(value === "Point Index"){
			scope.pointColorType = Potree.PointColorType.POINT_INDEX;
		}else if(value === "Normal"){
			scope.pointColorType = Potree.PointColorType.NORMAL;
		}else if(value === "Phong"){
			scope.pointColorType = Potree.PointColorType.PHONG;
		}
		
		document.getElementById("optMaterial_" + value).checked = true;
	};
	
	this.zoomTo = function(node, factor){
		scope.camera.zoomTo(node, factor);
		
		var bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld); 
		
		scope.orbitControls.target.copy(bs.center);
	};
	
	this.showAbout = function(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};
	
	
	
	this.getBoundingBox = function(pointclouds){
		var box = new THREE.Box3();
		
		for(var i = 0; i < pointclouds.length; i++){
			var pointcloud = pointclouds[i];
			
			var boxWorld = pointcloud.boundingBox.clone().applyMatrix4(pointcloud.matrixWorld);
			box.union(boxWorld);
		}
		
		return box;
	};
	
	this.fitToScreen = function(){
		var box = this.getBoundingBox(scope.pointclouds);
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		//scope.camera.zoomTo(node, 1);
		scope.zoomTo(node, 1);
	};
	
	this.setTopView = function(){
		var box = this.getBoundingBox(scope.pointclouds);
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		scope.camera.position.set(0, 1, 0);
		scope.camera.rotation.set(-Math.PI / 2, 0, 0);
		scope.camera.zoomTo(node, 1);
	};
	
	this.setFrontView = function(){
		var box = this.getBoundingBox(scope.pointclouds);
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		scope.camera.position.set(0, 0, 1);
		scope.camera.rotation.set(0, 0, 0);
		scope.camera.zoomTo(node, 1);
	};
	
	this.setLeftView = function(){
		var box = this.getBoundingBox(scope.pointclouds);
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		scope.camera.position.set(-1, 0, 0);
		scope.camera.rotation.set(0, -Math.PI / 2, 0);
		scope.camera.zoomTo(node, 1);
	};
	
	this.setRightView = function(){
		var box = this.getBoundingBox(scope.pointclouds);
		
		var node = new THREE.Object3D();
		node.boundingBox = box;
		
		scope.camera.position.set(1, 0, 0);
		scope.camera.rotation.set(0, Math.PI / 2, 0);
		scope.camera.zoomTo(node, 1);
	};
	
	

	
	this.initGUI = function(){
	
		stats = new Stats();
		document.getElementById("overlays").appendChild(stats.domElement);
		
		
		
		// create bootstrap toolbar
		if(true){
			var elToolbar = document.getElementById("toolbar");
			var elNavigationbar = document.getElementById("navigationbar");
		
			var createToolIcon = function(icon, title, callback){
				var elLi = document.createElement("li");
				var elA = document.createElement("a");
				var elImg = document.createElement("img");
				elImg.src = icon;
				elImg.title = title;
				elImg.onclick = callback;
				
				elLi.appendChild(elA);
				elA.appendChild(elImg);
				
				return elLi;
			};
			
			elNavigationbar.appendChild(createToolIcon(
				"../resources/icons/earth_controls_1.png",
				"Earth Controls",
				function(){scope.useEarthControls()}
			));
			
			
			elNavigationbar.appendChild(createToolIcon(
				"../resources/icons/fps_controls.png",
				"Flight Controls",
				function(){scope.useFPSControls()}
			));
			
			//elNavigationbar.appendChild(createToolIcon(
			//	"../resources/icons/fps_controls.png",
			//	"Geo Controls",
			//	function(){scope.useGeoControls()}
			//));
			
			elNavigationbar.appendChild(createToolIcon(
				"../resources/icons/orbit_controls.png",
				"Orbit Controls",
				function(){scope.useOrbitControls()}
			));
			
			elNavigationbar.appendChild(createToolIcon(
				"../resources/icons/focus.png",
				"focus on pointcloud",
				function(){scope.fitToScreen()}
			));
			//
			//elToolbar.appendChild(createToolIcon(
			//	"../resources/icons/flip_y_z.png",
			//	"flip y and z coordinates",
			//	function(){scope.flipYZ()}
			//));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/angle.png",
				"angle measurements",
				function(){scope.measuringTool.startInsertion({showDistances: false, showAngles: true, showArea: false, closed: true, maxMarkers: 3})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/point.png",
				"angle measurements",
				function(){scope.measuringTool.startInsertion({showDistances: false, showAngles: false, showCoordinates: true, showArea: false, closed: true, maxMarkers: 1})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/distance.png",
				"distance measurements",
				function(){scope.measuringTool.startInsertion({showDistances: true, showArea: false, closed: false})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/area.png",
				"area measurements",
				function(){scope.measuringTool.startInsertion({showDistances: true, showArea: true, closed: true})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/volume.png",
				"volume measurements",
				function(){scope.volumeTool.startInsertion()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/profile.png",
				"height profiles",
				function(){scope.profileTool.startInsertion()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/clip_volume.png",
				"clipping volumes",
				function(){scope.volumeTool.startInsertion({clip: true})}
			));
		}
		
		if(false){ // create toolbar
			var elToolbar = document.createElement("div");
			elToolbar.style.position = "absolute";
			elToolbar.style.width = "400px";
			elToolbar.style.bottom = "10px";
			elToolbar.style.right = "10px";
			this.renderArea.appendChild(elToolbar);
			
			var createToolIcon = function(icon, title, callback){
				var tool = document.createElement("img");
				tool.src = icon;
				tool.title = title;
				tool.onclick = callback;
				
				return tool;
			};
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/earth_controls_1.png",
				"Earth Controls",
				function(){scope.useEarthControls()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/fps_controls.png",
				"Flight Controls",
				function(){scope.useFPSControls()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/fps_controls.png",
				"Geo Controls",
				function(){scope.useGeoControls()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/orbit_controls.png",
				"Orbit Controls",
				function(){scope.useOrbitControls()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/focus.png",
				"focus on pointcloud",
				function(){scope.zoomTo(viewer.pointclouds)}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/flip_y_z.png",
				"flip y and z coordinates",
				function(){scope.flipYZ()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/angle.png",
				"angle measurements",
				function(){scope.measuringTool.startInsertion({showDistances: false, showAngles: true, showArea: false, closed: true, maxMarkers: 3})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/angle.png",
				"coordinate measurements",
				function(){scope.measuringTool.startInsertion({showDistances: false, showAngles: true, showArea: false, closed: true, maxMarkers: 1})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/distance.png",
				"distance measurements",
				function(){scope.measuringTool.startInsertion({showDistances: true, showArea: false, closed: false})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/area.png",
				"area measurements",
				function(){scope.measuringTool.startInsertion({showDistances: true, showArea: true, closed: true})}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/volume.png",
				"volume measurements",
				function(){scope.volumeTool.startInsertion()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/profile.png",
				"height profiles",
				function(){scope.profileTool.startInsertion()}
			));
			
			elToolbar.appendChild(createToolIcon(
				"../resources/icons/clip_volume.png",
				"clipping volumes",
				function(){scope.volumeTool.startInsertion({clip: true})}
			));
			
			
		}
	
	
		
		
		
		{ // create stats fields
			var createField = function(id, top){
				var field = document.createElement("div");
				field.id = id;
				field.classList.add("info");
				//field.style.position = "absolute";
				//field.style.left = "10px";
				//field.style.top = top + "px";
				field.style.width = "400px";
				field.style.color = "white";
				
				return field;
			};
			
			var elNumVisibleNodes = createField("lblNumVisibleNodes", 80);
			var elNumVisiblePoints = createField("lblNumVisiblePoints", 100);
			
			
			
			document.getElementById("overlays").appendChild(elNumVisibleNodes);
			document.getElementById("overlays").appendChild(elNumVisiblePoints);
		}
	
		{ // infos
			scope.infos = new function(){
			
				var _this = this;
			
				this.elements = {};
				
				this.domElement = document.createElement("div");
				this.domElement.id = "infos";
				this.domElement.classList.add("info");
				this.domElement.style.pointerEvents = "none";
				
				document.getElementById("overlays").appendChild(this.domElement);
			
				this.set = function(key, value){
					var element = this.elements[key];
					if(typeof element === "undefined"){
						element = document.createElement("div");
						_this.domElement.appendChild(element);
						this.elements[key] = element;
						
					}
					
					element.innerHTML = key + ": " + value;
				};
			
			};
		}
		
		var toggleQuality = function(element){
			scope.quality = element.value;
		}
	
		var togglePointSizing = function(element){
			scope.setPointSizeType(element.value);
		}
	
		var toggleEDL = function(element){
			scope.useEDL = element.checked;
		}
		
		var toggleSkybox = function(element){
			scope.showSkybox = element.checked;
		}
	
		var toggleStats = function(element){
			scope.showStats = element.checked;
		}
		
		var toggleBoundingBox = function(element){
			scope.showBoundingBox = element.checked;
		}
		
		{ // Materials
			var options = [ 
				"RGB", 
				"Color", 
				"Elevation", 
				"Intensity", 
				"Intensity Gradient", 
				"Classification", 
				"Return Number", 
				"Source", 
				"Phong",
				"Tree Depth"	
			];
			
			var elMaterialList = document.getElementById("materialList");
			for(var i = 0; i < options.length; i++){
				var option = options[i];
				
				var elLabel = document.createElement("label");
				var elRadio = document.createElement("input");
				var elText = document.createTextNode(" " + option);
				
				elRadio.type = "radio";
				elRadio.name = "optMaterial";
				elRadio.id = "optMaterial_" + option;
				elRadio.checked = this.material === option;
				elLabel.style.whiteSpace = "nowrap";
				
				elRadio.onchange = (function(matName){
					return function(event){
						viewer.setMaterial(matName);
					};
					
				})(option);
				
				elLabel.appendChild(elRadio);
				elLabel.appendChild(elText);
				
				elMaterialList.appendChild(elLabel);
				
			}
		}
		
		
		{ // Classifications
			
			var addClassificationItem = function(code, name){
				//<li><label><input type="checkbox" onClick="toggleStats(this)"/>&nbsp;Stats</label></li>
				var elClassificationList = document.getElementById("classificationList");
				
				var elLi = document.createElement("li");
				var elLabel = document.createElement("label");
				var elInput = document.createElement("input");
				var elText = document.createTextNode(" " + name);
				
				elInput.id = "chkClassification_" + code;
				elInput.type = "checkbox";
				elInput.checked = true;
				elInput.onclick = function(event){
					console.log(code + "; " + event.target.checked);
					scope.setClassificationVisibility(code, event.target.checked);
				}
				
				elLabel.style.whiteSpace = "nowrap";
				
				elClassificationList.appendChild(elLi);
				elLi.appendChild(elLabel);
				elLabel.appendChild(elInput);
				elLabel.appendChild(elText);
			};
			
			addClassificationItem(0, "never classified");
			addClassificationItem(1, "unclassified");
			addClassificationItem(2, "ground");
			addClassificationItem(3, "low vegetation");
			addClassificationItem(4, "medium vegetation");
			addClassificationItem(5, "high vegetation");
			addClassificationItem(6, "building");
			addClassificationItem(7, "low point(noise)");
			addClassificationItem(8, "key-point");
			addClassificationItem(9, "water");
			addClassificationItem(12, "overlap");
		}
		
		$( "#minNodeSize" ).slider({
			value: 100,
			min: 0,
			max: 1500,
			step: 1,
			slide: function( event, ui ) {
				viewer.minNodeSize = ui.value;
			}
		});
	
		$( "#sldPointBudget" ).slider({
			value: 1,
			min: 0.1,
			max: 5,
			step: 0.01,
			slide: function( event, ui ) {viewer.setPointBudget(ui.value * 1*1000*1000);}
		});
	
		$( "#sldPointSize" ).slider({
			value: 1,
			min: 0,
			max: 3,
			step: 0.01,
			slide: function( event, ui ) {viewer.setPointSize(ui.value);}
		});
		
		$( "#sldFOV" ).slider({
			value: 60,
			min: 20,
			max: 100,
			step: 1,
			slide: function( event, ui ) {viewer.setFOV(ui.value);}
		});
		
		$( "#sldOpacity" ).slider({
			value: 1,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {viewer.setOpacity(ui.value);}
		});
		
		$( "#sldEDLRadius" ).slider({
			value: 1,
			min: 1,
			max: 5,
			step: 0.01,
			slide: function( event, ui ) {viewer.setEDLRadius(ui.value);}
		});
		
		$( "#sldEDLStrength" ).slider({
			value: 1,
			min: 0,
			max: 3,
			step: 0.01,
			slide: function( event, ui ) {viewer.setEDLStrength(ui.value);}
		});
		
		
		
		scope.setPointSize(1);
		scope.setFOV(60);
		scope.setOpacity(1);
		scope.setEDLEnabled(false);
		scope.setEDLRadius(2);
		scope.setEDLStrength(1);
		scope.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
		scope.setPointBudget(1*1000*1000);
		scope.setShowBoundingBox(false);
		scope.setShowDebugInfos(false);
		scope.setShowStats(false);
		scope.setFreeze(false);
		scope.setNavigationMode("Orbit");
	
	};
	
	this.createControls = function(){
		{ // create FIRST PERSON CONTROLS
			scope.fpControls = new THREE.FirstPersonControls(scope.camera, scope.renderer.domElement);
			scope.fpControls.enabled = false;
			scope.fpControls.addEventListener("proposeTransform", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}
			});
		}
		
		{ // create GEO CONTROLS
			scope.geoControls = new Potree.GeoControls(scope.camera, scope.renderer.domElement);
			scope.geoControls.enabled = false;
			scope.geoControls.addEventListener("proposeTransform", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}
			});
		}
	
		{ // create ORBIT CONTROLS
			scope.orbitControls = new Potree.OrbitControls(scope.camera, scope.renderer.domElement);
			scope.orbitControls.enabled = false;
			scope.orbitControls.addEventListener("proposeTransform", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}
			});
			scope.renderArea.addEventListener("dblclick", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}
				
				event.preventDefault();
			
				var rect = scope.renderArea.getBoundingClientRect();
				
				var mouse =  {
					x: ( (event.clientX - rect.left) / scope.renderArea.clientWidth ) * 2 - 1,
					y: - ( (event.clientY - rect.top) / scope.renderArea.clientHeight ) * 2 + 1
				};
				
				var pointcloud = null;
				var distance = Number.POSITIVE_INFINITY;
				var I = null;
				
				for(var i = 0; i < scope.pointclouds.length; i++){
					intersection = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, [scope.pointclouds[i]]);
					if(!intersection){
						continue;
					}
					
					var tDist = scope.camera.position.distanceTo(intersection);
					if(tDist < distance){
						pointcloud = scope.pointclouds[i];
						distance = tDist;
						I = intersection;
					}
				}
				
				if(I != null){
				
					var targetRadius = 0;
					if(!scope.jumpDistance){
						var camTargetDistance = scope.camera.position.distanceTo(scope.orbitControls.target);
					
						var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
						vector.unproject(scope.camera);

						var direction = vector.sub(scope.camera.position).normalize();
						var ray = new THREE.Ray(scope.camera.position, direction);
						
						var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
						var lastNode = nodes[nodes.length - 1];
						var radius = lastNode.boundingSphere.radius;
						var targetRadius = Math.min(camTargetDistance, radius);
						var targetRadius = Math.max(scope.minimumJumpDistance, targetRadius);
					}else{
						targetRadius = scope.jumpDistance;
					}
					
					var d = scope.camera.getWorldDirection().multiplyScalar(-1);
					var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
					var controlsTargetPosition = I;
					
					var animationDuration = 600;
					
					var easing = TWEEN.Easing.Quartic.Out;
					
					scope.controls.enabled = false;
					
					// animate position
					var tween = new TWEEN.Tween(scope.camera.position).to(cameraTargetPosition, animationDuration);
					tween.easing(easing);
					tween.start();
					
					// animate target
					var tween = new TWEEN.Tween(scope.orbitControls.target).to(I, animationDuration);
					tween.easing(easing);
					tween.onComplete(function(){
						scope.controls.enabled = true;
						scope.fpControls.moveSpeed = radius / 2;
						scope.geoControls.moveSpeed = radius / 2;
					});
					tween.start();
				}
			});
		}
		
		{ // create EARTH CONTROLS
			scope.earthControls = new THREE.EarthControls(scope.camera, scope.renderer, scope.scenePointCloud);
			scope.earthControls.enabled = false;
			scope.earthControls.addEventListener("proposeTransform", function(event){
				if(scope.pointclouds.length === 0){
					return;
				}
			});
		}
	};
	
	this.addPointCloud = function(path, callback){
		callback = callback || function(){};
		var initPointcloud = function(pointcloud){
		
			scope.pointclouds.push(pointcloud);
			
			if(false){
				var id = (scope.pointclouds.length - 1);
				var checkbox = document.createElement('input');
				checkbox.type = "checkbox";
				checkbox.name = "pointcloud_" + id;
				checkbox.value = "value";
				checkbox.id = id;
				checkbox.checked = true;
				checkbox.style.position = "absolute";
				checkbox.style.top = 60 + ((scope.pointclouds.length - 1) * 30);
				checkbox.onclick = function(event){
					console.log(event);
					scope.pointclouds[parseInt(event.target.id)].visible = event.target.checked;
				};

				var label = document.createElement('label')
				label.htmlFor = id;
				label.style.color = "#ffffff";
				label.appendChild(document.createTextNode("pointcloud " + id));
				label.style.position = "absolute";
				label.style.top = 60 + ((scope.pointclouds.length - 1) * 30);
				label.style.left = 30;

				document.body.appendChild(checkbox);
				document.body.appendChild(label);

			}
		
			scope.referenceFrame.add(pointcloud);
		
			var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
			 
			scope.referenceFrame.updateMatrixWorld(true);
			
			if(sg.radius > 50*1000){
				scope.camera.near = 10;
			}else if(sg.radius > 10*1000){
				scope.camera.near = 2;
			}else if(sg.radius > 1000){
				scope.camera.near = 1;
			}else if(sg.radius > 100){
				scope.camera.near = 0.5;
			}else{
				scope.camera.near = 0.1;
			}

			scope.referenceFrame.position.sub(sg.center);
			scope.referenceFrame.updateMatrixWorld(true);
			
			scope.flipYZ();
			
			scope.zoomTo(pointcloud, 1);
			
			scope.earthControls.pointclouds.push(pointcloud);	
			
			scope.dispatchEvent({"type": "pointcloud_loaded", "pointcloud": pointcloud});
			
			callback(pointcloud);
		};
		this.addEventListener("pointcloud_loaded", pointCloudLoadedCallback);
		
		// load pointcloud
		if(!path){
			
		}else if(path.indexOf("cloud.js") > 0){
		
			Potree.POCLoader.load(path, function(geometry){
				pointcloud = new Potree.PointCloudOctree(geometry);
				
				initPointcloud(pointcloud);				
			});
		}else if(path.indexOf(".vpc") > 0){
			Potree.PointCloudArena4DGeometry.load(path, function(geometry){
				pointcloud = new Potree.PointCloudArena4D(geometry);
				
				initPointcloud(pointcloud);
			});
		}
	};
	
	this.initThree = function(){
		var width = renderArea.clientWidth;
		var height = renderArea.clientHeight;
		var aspect = width / height;
		var near = 0.1;
		var far = 1000*1000;

		scope.scene = new THREE.Scene();
		scope.scenePointCloud = new THREE.Scene();
		scope.sceneBG = new THREE.Scene();
		
		scope.camera = new THREE.PerspectiveCamera(scope.fov, aspect, near, far);
		//camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 100000);
		scope.cameraBG = new THREE.Camera();
		scope.camera.rotation.order = 'ZYX';
		
		scope.referenceFrame = new THREE.Object3D();
		scope.scenePointCloud.add(scope.referenceFrame);

		scope.renderer = new THREE.WebGLRenderer();
		scope.renderer.setSize(width, height);
		scope.renderer.autoClear = false;
		renderArea.appendChild(scope.renderer.domElement);
		scope.renderer.domElement.tabIndex = "2222";
		scope.renderer.domElement.addEventListener("mousedown", function(){scope.renderer.domElement.focus();});
		
		skybox = Potree.utils.loadSkybox("../resources/textures/skybox/");

		// camera and controls
		scope.camera.position.set(-304, 372, 318);
		scope.camera.rotation.y = -Math.PI / 4;
		scope.camera.rotation.x = -Math.PI / 6;
		
		this.createControls();
		
		//scope.useEarthControls();
		
		// enable frag_depth extension for the interpolation shader, if available
		scope.renderer.context.getExtension("EXT_frag_depth");
		
		//this.addPointCloud(pointcloudPath);
		
		var grid = Potree.utils.createGrid(5, 5, 2);
		scope.scene.add(grid);
		
		scope.measuringTool = new Potree.MeasuringTool(scope.scenePointCloud, scope.camera, scope.renderer);
		scope.profileTool = new Potree.ProfileTool(scope.scenePointCloud, scope.camera, scope.renderer);
		scope.transformationTool = new Potree.TransformationTool(scope.scenePointCloud, scope.camera, scope.renderer);
		scope.volumeTool = new Potree.VolumeTool(scope.scenePointCloud, scope.camera, scope.renderer, scope.transformationTool);
		
		scope.profileTool.addEventListener("profile_added", function(profileEvent){
			var profileButton = document.createElement("input");
			profileButton.type = "button";
			profileButton.style.width = "100%";
			profileButton.value = "profile " + scope.profileTool.profiles.length;
			
			profileButton.onclick = function(clickEvent){
				scope.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					scope.toGeo);
				profileEvent.profile.addEventListener("marker_moved", function(){
					scope.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					scope.toGeo);
				});
				profileEvent.profile.addEventListener("width_changed", function(){
					scope.profileTool.draw(
					profileEvent.profile, 
					$("#profile_draw_container")[0], 
					scope.toGeo);
				});
			};
			
			
		
			$("#profile_selection")[0].appendChild(profileButton);
		});
		
		
		// background
		// var texture = THREE.ImageUtils.loadTexture( '../resources/textures/background.gif' );
		var texture = Potree.utils.createBackgroundTexture(512, 512);
		
		texture.minFilter = texture.magFilter = THREE.NearestFilter;
		texture.minFilter = texture.magFilter = THREE.LinearFilter;
		
		var bg = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(2, 2, 0),
			new THREE.MeshBasicMaterial({
				map: texture
			})
		);
		//bg.position.z = -1;
		bg.material.depthTest = false;
		bg.material.depthWrite = false;
		scope.sceneBG.add(bg);			
		
		window.addEventListener( 'keydown', onKeyDown, false );
		
		scope.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		scope.directionalLight.position.set( 10, 10, 10 );
		scope.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		scope.scenePointCloud.add( scope.directionalLight );
		
		var light = new THREE.AmbientLight( 0x555555 ); // soft white light
		scope.scenePointCloud.add( light );
		
	}

	this.flipYZ = function(){
		scope.isFlipYZ = !scope.isFlipYZ;
		
		if(scope.isFlipYZ){
			scope.referenceFrame.matrix.copy(new THREE.Matrix4());
			scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
				1,0,0,0,
				0,0,1,0,
				0,-1,0,0,
				0,0,0,1
			));
			
		}else{
			scope.referenceFrame.matrix.copy(new THREE.Matrix4());
			scope.referenceFrame.applyMatrix(new THREE.Matrix4().set(
				1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1
			));
		}
		
		scope.referenceFrame.updateMatrixWorld(true);
		scope.pointclouds[0].updateMatrixWorld();
		var sg = scope.pointclouds[0].boundingSphere.clone().applyMatrix4(scope.pointclouds[0].matrixWorld);
		scope.referenceFrame.position.copy(sg.center).multiplyScalar(-1);
		scope.referenceFrame.updateMatrixWorld(true);
		scope.referenceFrame.position.y -= scope.pointclouds[0].getWorldPosition().y;
		scope.referenceFrame.updateMatrixWorld(true);
	}

	function onKeyDown(event){
		//console.log(event.keyCode);
		
		if(event.keyCode === 69){
			// e pressed
			
			scope.transformationTool.translate();
		}else if(event.keyCode === 82){
			// r pressed
			
			scope.transformationTool.scale();
		}else if(event.keyCode === 84){
			// r pressed
			
			scope.transformationTool.rotate();
		}
	};

	var intensityMax = null;
	var heightMin = null;
	var heightMax = null;

	this.update = function(delta, timestamp){
		Potree.pointLoadLimit = Potree.pointBudget * 2;
		
		scope.directionalLight.position.copy(scope.camera.position);
		scope.directionalLight.lookAt(new THREE.Vector3().addVectors(scope.camera.position, scope.camera.getWorldDirection()));
		
		var visibleNodes = 0;
		var visiblePoints = 0;
		var progress = 0;
		
		for(var i = 0; i < scope.pointclouds.length; i++){
			var pointcloud = scope.pointclouds[i];
			var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
			if(!intensityMax){
				var root = pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if(attributes.intensity){
						var array = attributes.intensity.array;
						var max = 0;
						for(var i = 0; i < array.length; i++){
							max = Math.max(array[i]);
						}
						
						if(max <= 1){
							intensityMax = 1;
						}else if(max <= 256){
							intensityMax = 255;
						}else{
							intensityMax = max;
						}
					}
				}
			}
			
			if(heightMin === null){
				heightMin = bbWorld.min.y;
				heightMax = bbWorld.max.y;
			}
				
			pointcloud.material.clipMode = scope.clipMode;
			pointcloud.material.heightMin = heightMin;
			pointcloud.material.heightMax = heightMax;
			pointcloud.material.intensityMin = 0;
			pointcloud.material.intensityMax = intensityMax;
			pointcloud.showBoundingBox = scope.showBoundingBox;
			pointcloud.generateDEM = scope.useDEMCollisions;
			pointcloud.minimumNodePixelSize = scope.minNodeSize;
			
			//if(!scope.freeze){
			//	pointcloud.update(scope.camera, scope.renderer);
			//}
			
			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;
			
			progress += pointcloud.progress;
		}
		
		if(!scope.freeze){
			var result = Potree.updatePointClouds(scope.pointclouds, scope.camera, scope.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
		}
		
		
		if(stats && scope.showStats){
			document.getElementById("lblNumVisibleNodes").style.display = "";
			document.getElementById("lblNumVisiblePoints").style.display = "";
			stats.domElement.style.display = "";
		
			stats.update();
		
			document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + visibleNodes;
			document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(visiblePoints);
		}else if(stats){
			document.getElementById("lblNumVisibleNodes").style.display = "none";
			document.getElementById("lblNumVisiblePoints").style.display = "none";
			stats.domElement.style.display = "none";
		}
		
		scope.camera.fov = scope.fov;
		
		if(scope.controls){
			scope.controls.update(delta);
		}

		// update progress bar
		if(scope.pointclouds.length > 0){
			scope.progressBar.progress = progress / scope.pointclouds.length;
			
			var message;
			if(progress === 0){
				message = "loading";
			}else{
				message = "loading: " + parseInt(progress*100 / scope.pointclouds.length) + "%";
			}
			scope.progressBar.message = message;
			
			if(progress >= 0.999){
				scope.progressBar.hide();
			}else if(progress < 1){
				scope.progressBar.show();
			}
		}
		
		scope.volumeTool.update();
		scope.transformationTool.update();
		scope.profileTool.update();
		
		
		var clipBoxes = [];
		
		for(var i = 0; i < scope.profileTool.profiles.length; i++){
			var profile = scope.profileTool.profiles[i];
			
			for(var j = 0; j < profile.boxes.length; j++){
				var box = profile.boxes[j];
				box.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				clipBoxes.push(boxInverse);
			}
		}
		
		for(var i = 0; i < scope.volumeTool.volumes.length; i++){
			var volume = scope.volumeTool.volumes[i];
			
			if(volume.clip){
				volume.updateMatrixWorld();
				var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
			
				clipBoxes.push(boxInverse);
			}
		}
		
		
		for(var i = 0; i < scope.pointclouds.length; i++){
			scope.pointclouds[i].material.setClipBoxes(clipBoxes);
		}
		
		{// update annotations
			var distances = [];
			for(var i = 0; i < scope.annotations.length; i++){
				var ann = scope.annotations[i];
				var screenPos = ann.position.clone().project(scope.camera);
				
				screenPos.x = scope.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = scope.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);
				
				ann.domElement.style.left = Math.floor(screenPos.x - ann.domElement.clientWidth / 2);
				ann.domElement.style.top = Math.floor(screenPos.y);
				
				//ann.domDescription.style.left = screenPos.x - ann.domDescription.clientWidth / 2 + 10;
				//ann.domDescription.style.top = screenPos.y + 30;

				distances.push({annotation: ann, distance: screenPos.z});
				
				if(-1 > screenPos.z || screenPos.z > 1){
					ann.domElement.style.display = "none";
				}else{
					ann.domElement.style.display = "initial";
				}
			}
			distances.sort(function(a,b){return b.distance - a.distance});
			for(var i = 0; i < distances.length; i++){
				var ann = distances[i].annotation;
				ann.domElement.style.zIndex = "" + i;
				if(ann.descriptionVisible){
					ann.domElement.style.zIndex += 100;
				}
			}
		}
		
		if(scope.showDebugInfos){
			scope.infos.set("camera.position", "camera.position: " + 
				viewer.camera.position.x.toFixed(2) 
				+ ", " + viewer.camera.position.y.toFixed(2) 
				+ ", " + viewer.camera.position.z.toFixed(2)
			);
		}
		
		TWEEN.update(timestamp);
	}

	this.useEarthControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}		

		scope.controls = scope.earthControls;
		scope.controls.enabled = true;
	}
	
	this.useGeoControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.geoControls;
		scope.controls.enabled = true;
		
		scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
	}

	this.useFPSControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}

		scope.controls = scope.fpControls;
		scope.controls.enabled = true;
		
		scope.controls.moveSpeed = scope.pointclouds[0].boundingSphere.radius / 6;
	}

	this.useOrbitControls = function(){
		if(scope.controls){
			scope.controls.enabled = false;
		}
		
		scope.controls = scope.orbitControls;
		scope.controls.enabled = true;
		
		if(scope.pointclouds.length > 0){
			scope.controls.target.copy(scope.pointclouds[0].boundingSphere.center.clone().applyMatrix4(scope.pointclouds[0].matrixWorld));
		}
	};
	
	this.addAnnotation = function(position, args){
		var cameraPosition = args.cameraPosition;
		var cameraTarget = args.cameraTarget || position;
		var description = args.description || null;
		var title = args.title || null;
		
		var annotation = new Potree.Annotation(scope, {
			"position": position,
			"cameraPosition": cameraPosition,
			"cameraTarget": cameraTarget,
			"title": title,
			"description": description
		});
		
		scope.annotations.push(annotation);
		scope.renderArea.appendChild(annotation.domElement);
		//scope.renderArea.appendChild(annotation.domDescription);
	}

	var PotreeRenderer = function(){

		this.render = function(){
			{// resize
				var width = renderArea.clientWidth;
				var height = renderArea.clientHeight;
				var aspect = width / height;
				
				scope.camera.aspect = aspect;
				scope.camera.updateProjectionMatrix();
				
				scope.renderer.setSize(width, height);
			}
			

			// render skybox
			if(scope.showSkybox){
				scope.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}
			
			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
				if(pointcloud.originalMaterial){
					pointcloud.material = pointcloud.originalMaterial;
				}
				
				var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
				pointcloud.material.size = scope.pointSize;
				pointcloud.material.opacity = scope.opacity;
				pointcloud.material.pointColorType = scope.pointColorType;
				pointcloud.material.pointSizeType = scope.pointSizeType;
				pointcloud.material.pointShape = (scope.quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
				pointcloud.material.interpolate = (scope.quality === "Interpolation");
				pointcloud.material.weighted = false;
			}
			
			// render scene
			scope.renderer.render(scope.scene, scope.camera);
			scope.renderer.render(scope.scenePointCloud, scope.camera);
			
			scope.profileTool.render();
			scope.volumeTool.render();
			
			scope.renderer.clearDepth();
			scope.measuringTool.render();
			scope.transformationTool.render();
		};
	};
	var potreeRenderer = new PotreeRenderer();

	// high quality rendering using splats
	var highQualityRenderer = null;
	var HighQualityRenderer = function(){

		var depthMaterial = null;
		var attributeMaterial = null;
		var normalizationMaterial = null;
		
		var rtDepth;
		var rtNormalize;
		
		var initHQSPlats = function(){
			if(depthMaterial != null){
				return;
			}
		
			depthMaterial = new Potree.PointCloudMaterial();
			attributeMaterial = new Potree.PointCloudMaterial();
		
			depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
			depthMaterial.pointShape = Potree.PointShape.CIRCLE;
			depthMaterial.interpolate = false;
			depthMaterial.weighted = false;
			depthMaterial.minSize = 2;
						
			attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
			attributeMaterial.interpolate = false;
			attributeMaterial.weighted = true;
			attributeMaterial.minSize = 2;

			rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
				minFilter: THREE.NearestFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat, 
				type: THREE.FloatType
			} );

			rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
				minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat, 
				type: THREE.FloatType
			} );
			
			var uniformsNormalize = {
				depthMap: { type: "t", value: rtDepth },
				texture: { type: "t", value: rtNormalize }
			};
			
			normalizationMaterial = new THREE.ShaderMaterial({
				uniforms: uniformsNormalize,
				vertexShader: Potree.Shaders["normalize.vs"],
				fragmentShader: Potree.Shaders["normalize.fs"]
			});
		}
		
		var resize = function(width, height){
			if(rtDepth.width == width && rtDepth.height == height){
				return;
			}
			
			rtDepth.dispose();
			rtNormalize.dispose();
			
			scope.camera.aspect = width / height;
			scope.camera.updateProjectionMatrix();
			
			scope.renderer.setSize(width, height);
			rtDepth.setSize(width, height);
			rtNormalize.setSize(width, height);
		};

		// render with splats
		this.render = function(renderer){
		
			var width = renderArea.clientWidth;
			var height = renderArea.clientHeight;
		
			initHQSPlats();
			
			resize(width, height);
			
			
			scope.renderer.clear();
			if(scope.showSkybox){
				skybox.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}
			scope.renderer.render(scope.scene, scope.camera);
			
			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
			
				depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
				attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
			
				var originalMaterial = pointcloud.material;
				
				{// DEPTH PASS
					depthMaterial.size = scope.pointSize;
					depthMaterial.pointSizeType = scope.pointSizeType;
					depthMaterial.screenWidth = width;
					depthMaterial.screenHeight = height;
					depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.fov = scope.camera.fov * (Math.PI / 180);
					depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
					depthMaterial.near = scope.camera.near;
					depthMaterial.far = scope.camera.far;
					depthMaterial.heightMin = heightMin;
					depthMaterial.heightMax = heightMax;
					depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					depthMaterial.bbSize = pointcloud.material.bbSize;
					depthMaterial.treeType = pointcloud.material.treeType;
					depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
					
					scope.scenePointCloud.overrideMaterial = depthMaterial;
					scope.renderer.clearTarget( rtDepth, true, true, true );
					scope.renderer.render(scope.scenePointCloud, scope.camera, rtDepth);
					scope.scenePointCloud.overrideMaterial = null;
				}
				
				{// ATTRIBUTE PASS
					attributeMaterial.size = scope.pointSize;
					attributeMaterial.pointSizeType = scope.pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = scope.pointColorType;
					attributeMaterial.depthMap = rtDepth;
					attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
					attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
					attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
					attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
					attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = scope.camera.near;
					attributeMaterial.far = scope.camera.far;
					attributeMaterial.heightMin = heightMin;
					attributeMaterial.heightMax = heightMax;
					attributeMaterial.intensityMin = pointcloud.material.intensityMin;
					attributeMaterial.intensityMax = pointcloud.material.intensityMax;
					attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
					attributeMaterial.clipMode = pointcloud.material.clipMode;
					attributeMaterial.bbSize = pointcloud.material.bbSize;
					attributeMaterial.treeType = pointcloud.material.treeType;
					attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
					
					scope.scenePointCloud.overrideMaterial = attributeMaterial;
					scope.renderer.clearTarget( rtNormalize, true, true, true );
					scope.renderer.render(scope.scenePointCloud, scope.camera, rtNormalize);
					scope.scenePointCloud.overrideMaterial = null;
					
					pointcloud.material = originalMaterial;
				}
			}
			
			if(scope.pointclouds.length > 0){
				{// NORMALIZATION PASS
					normalizationMaterial.uniforms.depthMap.value = rtDepth;
					normalizationMaterial.uniforms.texture.value = rtNormalize;
					Potree.utils.screenPass.render(scope.renderer, normalizationMaterial);
				}
				
				scope.volumeTool.render();
				scope.renderer.clearDepth();
				scope.profileTool.render();
				scope.measuringTool.render();
				scope.transformationTool.render();
			}

		}
	};



	var edlRenderer = null;
	var EDLRenderer = function(){

		var edlMaterial = null;
		var attributeMaterials = [];
		
		//var depthTexture = null;
		
		var rtColor = null;
		var gl = scope.renderer.context;
		
		var initEDL = function(){
			if(edlMaterial != null){
				return;
			}
			
			//var depthTextureExt = gl.getExtension("WEBGL_depth_texture"); 
			
			edlMaterial = new Potree.EyeDomeLightingMaterial();
			

			rtColor = new THREE.WebGLRenderTarget( 1024, 1024, { 
				minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat, 
				type: THREE.FloatType,
				//type: THREE.UnsignedByteType,
				//depthBuffer: false,
				//stencilBuffer: false
			} );
			
		};
		
		var resize = function(){
			var width = renderArea.clientWidth;
			var height = renderArea.clientHeight;
			var aspect = width / height;
			
			var needsResize = (rtColor.width != width || rtColor.height != height);
		
			// disposal will be unnecessary once this fix made it into three.js master: 
			// https://github.com/mrdoob/three.js/pull/6355
			if(needsResize){
				rtColor.dispose();
			}
			
			scope.camera.aspect = aspect;
			scope.camera.updateProjectionMatrix();
			
			scope.renderer.setSize(width, height);
			rtColor.setSize(width, height);
		}

		this.render = function(){
		
			initEDL();
			
			resize();
			
			scope.renderer.clear();
			if(scope.showSkybox){
				scope.camera.rotation.copy(scope.camera.rotation);
				scope.renderer.render(skybox.scene, skybox.camera);
			}else{
				scope.renderer.render(scope.sceneBG, scope.cameraBG);
			}
			scope.renderer.render(scope.scene, scope.camera);
			
			var originalMaterials = [];
			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
				var width = renderArea.clientWidth;
				var height = renderArea.clientHeight;
				
				if(attributeMaterials.length <= i ){
					var attributeMaterial = new Potree.PointCloudMaterial();
						
					attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
					attributeMaterial.interpolate = false;
					attributeMaterial.weighted = false;
					attributeMaterial.minSize = 2;
					attributeMaterial.useLogarithmicDepthBuffer = false;
					attributeMaterial.useEDL = true;
					attributeMaterials.push(attributeMaterial);
				}
				var attributeMaterial = attributeMaterials[i];
			
				var octreeSize = pointcloud.pcoGeometry.boundingBox.size().x;
			
				originalMaterials.push(pointcloud.material);
				
				scope.renderer.clearTarget( rtColor, true, true, true );
				
				{// COLOR & DEPTH PASS
					attributeMaterial = pointcloud.material;
					attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
					attributeMaterial.interpolate = false;
					attributeMaterial.weighted = false;
					attributeMaterial.minSize = 2;
					attributeMaterial.useLogarithmicDepthBuffer = false;
					attributeMaterial.useEDL = true;
					
					attributeMaterial.size = scope.pointSize;
					attributeMaterial.pointSizeType = scope.pointSizeType;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.pointColorType = scope.pointColorType;
					attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = octreeSize;
					attributeMaterial.fov = scope.camera.fov * (Math.PI / 180);
					attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
					attributeMaterial.near = scope.camera.near;
					attributeMaterial.far = scope.camera.far;
					attributeMaterial.heightMin = heightMin;
					attributeMaterial.heightMax = heightMax;
					attributeMaterial.intensityMin = pointcloud.material.intensityMin;
					attributeMaterial.intensityMax = pointcloud.material.intensityMax;
					attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
					attributeMaterial.clipMode = pointcloud.material.clipMode;
					attributeMaterial.bbSize = pointcloud.material.bbSize;
					attributeMaterial.treeType = pointcloud.material.treeType;
					attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
					
					pointcloud.material = attributeMaterial;
					for(var j = 0; j < pointcloud.visibleNodes.length; j++){
						var node = pointcloud.visibleNodes[j];
						if(pointcloud instanceof Potree.PointCloudOctree){
							node.sceneNode.material = attributeMaterial;
						}else if(pointcloud instanceof Potree.PointCloudArena4D){
							node.material = attributeMaterial;
						}
					}
				}
				
			}
			
			scope.renderer.render(scope.scenePointCloud, scope.camera, rtColor);
			// bit of a hack here. The EDL pass will mess up the text of the volume tool
			// so volume tool is rendered again afterwards
			scope.volumeTool.render(rtColor);
					
			for(var i = 0; i < scope.pointclouds.length; i++){
				var pointcloud = scope.pointclouds[i];
				var originalMaterial = originalMaterials[i];
				pointcloud.material = originalMaterial;
				for(var j = 0; j < pointcloud.visibleNodes.length; j++){
					var node = pointcloud.visibleNodes[j];
					if(pointcloud instanceof Potree.PointCloudOctree){
						node.sceneNode.material = originalMaterial;
					}else if(pointcloud instanceof Potree.PointCloudArena4D){
						node.material = originalMaterial;
					}
				}
			}
				
			if(scope.pointclouds.length > 0){
				{ // EDL OCCLUSION PASS
					edlMaterial.uniforms.screenWidth.value = width;
					edlMaterial.uniforms.screenHeight.value = height;
					edlMaterial.uniforms.near.value = scope.camera.near;
					edlMaterial.uniforms.far.value = scope.camera.far;
					edlMaterial.uniforms.colorMap.value = rtColor;
					edlMaterial.uniforms.expScale.value = scope.camera.far;
					edlMaterial.uniforms.edlScale.value = scope.edlScale;
					edlMaterial.uniforms.radius.value = scope.edlRadius;
					edlMaterial.uniforms.opacity.value = scope.opacity;
					edlMaterial.depthTest = true;
					edlMaterial.depthWrite = true;
					edlMaterial.transparent = true;
				
					Potree.utils.screenPass.render(scope.renderer, edlMaterial);
				}	
				
				scope.renderer.render(scope.scene, scope.camera);
				
				scope.profileTool.render();
				scope.volumeTool.render();
				scope.renderer.clearDepth();
				scope.measuringTool.render();
				scope.transformationTool.render();
			}


		}
	};

	//var toggleMessage = 0;

	function loop(timestamp) {
		requestAnimationFrame(loop);
		
		//var start = new Date().getTime();
		scope.update(clock.getDelta(), timestamp);
		//var end = new Date().getTime();
		//var duration = end - start;
		//toggleMessage++;
		//if(toggleMessage > 30){
		//	document.getElementById("lblMessage").innerHTML = "update: " + duration + "ms";
		//	toggleMessage = 0;
		//}
		
		if(scope.useEDL && Potree.Features.SHADER_EDL.isSupported()){
			if(!edlRenderer){
				edlRenderer = new EDLRenderer();
			}
			edlRenderer.render(scope.renderer);
		}else if(scope.quality === "Splats"){
			if(!highQualityRenderer){
				highQualityRenderer = new HighQualityRenderer();
			}
			highQualityRenderer.render(scope.renderer);
		}else{
			potreeRenderer.render();
		}
	};

	scope.initThree();
	scope.initGUI();

	requestAnimationFrame(loop);
};

Potree.Viewer.prototype = Object.create( THREE.EventDispatcher.prototype );













































Potree.updatePointClouds = function(pointclouds, camera, renderer){

	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		for(var j = 0; j < pointcloud.profileRequests.length; j++){
			pointcloud.profileRequests[j].update();
		}
	}
	
	var result = Potree.updateVisibility(pointclouds, camera, renderer);
	
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}
	
	return result;
};


Potree.updateVisibility = function(pointclouds, camera, renderer){
	var numVisibleNodes = 0;
	var numVisiblePoints = 0;
	
	var visibleNodes = [];
	var visibleGeometry = [];
	var unloadedGeometry = [];
	
	var frustums = [];
	var camObjPositions = [];

	// calculate object space frustum and cam pos and setup priority queue
	var priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		pointcloud.numVisibleNodes = 0;
		pointcloud.numVisiblePoints = 0;
		pointcloud.visibleNodes = [];
		pointcloud.visibleGeometry = [];
		
		// frustum in object space
		camera.updateMatrixWorld();
		var frustum = new THREE.Frustum();
		var viewI = camera.matrixWorldInverse;
		var world = pointcloud.matrixWorld;
		var proj = camera.projectionMatrix;
		var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromMatrix( fm );
		frustums.push(frustum);
		
		// camera position in object space
		var view = camera.matrixWorld;
		var worldI = new THREE.Matrix4().getInverse(world);
		var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
		camObjPositions.push(camObjPos);
		
		if(pointcloud.visible){
			priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
		}
		
		// hide all previously visible nodes
		if(pointcloud.root instanceof Potree.PointCloudOctreeNode){
			pointcloud.hideDescendants(pointcloud.root.sceneNode);
		}
		for(var j = 0; j < pointcloud.boundingBoxNodes.length; j++){
			pointcloud.boundingBoxNodes[j].visible = false;
		}
	}
	
	while(priorityQueue.size() > 0){
		var element = priorityQueue.pop();
		var node = element.node;
		var parent = element.parent;
		var pointcloud = pointclouds[element.pointcloud];
		
		var box = node.boundingBox;
		var frustum = frustums[element.pointcloud];
		var camObjPos = camObjPositions[element.pointcloud];
		
		var insideFrustum = frustum.intersectsBox(box);
		var visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.numPoints > Potree.pointBudget);
		
		if(!visible){
			continue;
		}
		
		numVisibleNodes++;
		numVisiblePoints += node.numPoints;
		
		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.numPoints;
		
		
		// if geometry is loaded, create a scene node
		if(node instanceof Potree.PointCloudOctreeGeometryNode){
			var geometryNode = node;
			var geometry = geometryNode.geometry;
			
			if((typeof parent === "undefined" || parent instanceof Potree.PointCloudOctreeNode) 
					&& geometryNode.loaded){
				var pcoNode = new Potree.PointCloudOctreeNode();
				var sceneNode = new THREE.PointCloud(geometry, pointcloud.material);
				sceneNode.visible = false;
				
				pcoNode.octree = pointcloud;
				pcoNode.name = geometryNode.name;
				pcoNode.level = geometryNode.level;
				pcoNode.numPoints = geometryNode.numPoints;
				pcoNode.boundingBox = geometry.boundingBox;
				pcoNode.tightBoundingBox = geometry.tightBoundingBox;
				pcoNode.boundingSphere = pcoNode.boundingBox.getBoundingSphere();
				pcoNode.geometryNode = geometryNode;
				pcoNode.parent = parent;
				pcoNode.children = {};
				for(var key in geometryNode.children){
					pcoNode.children[key] = geometryNode.children[key];
				}
				
				sceneNode.boundingBox = pcoNode.boundingBox;
				sceneNode.boundingSphere = pcoNode.boundingSphere;
				sceneNode.numPoints = pcoNode.numPoints;
				sceneNode.level = pcoNode.level;
				
				pcoNode.sceneNode = sceneNode;
				
				if(typeof node.parent === "undefined"){
					pointcloud.root = pcoNode;
					pointcloud.add(pcoNode.sceneNode);
					
					sceneNode.matrixWorld.multiplyMatrices( pointcloud.matrixWorld, sceneNode.matrix );
				}else{
					var childIndex = parseInt(pcoNode.name[pcoNode.name.length - 1]);
					parent.sceneNode.add(sceneNode);
					parent.children[childIndex] = pcoNode;
					
					sceneNode.matrixWorld.multiplyMatrices( parent.sceneNode.matrixWorld, sceneNode.matrix );
				}
				
				// when a PointCloudOctreeGeometryNode is disposed, 
				// then replace reference to PointCloudOctreeNode with PointCloudOctreeGeometryNode
				// as it was before it was loaded
				var disposeListener = function(parent, pcoNode, geometryNode){
					return function(){
						var childIndex = parseInt(pcoNode.name[pcoNode.name.length - 1]);
						parent.sceneNode.remove(pcoNode.sceneNode);
						parent.children[childIndex] = geometryNode;
					}
				}(parent, pcoNode, node);
				pcoNode.geometryNode.oneTimeDisposeHandlers.push(disposeListener);
				
				node = pcoNode;
			}
			
			if(!geometryNode.loaded){
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
			
		}
		
		
		if(node instanceof Potree.PointCloudOctreeNode){
			Potree.PointCloudOctree.lru.touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;
			
			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);
			
			visibleGeometry.push(node.geometryNode);
			pointcloud.visibleGeometry.push(node.geometryNode);
			
			if(node.parent){
				node.sceneNode.matrixWorld.multiplyMatrices( node.parent.sceneNode.matrixWorld, node.sceneNode.matrix );
			}else{
				node.sceneNode.matrixWorld.multiplyMatrices( pointcloud.matrixWorld, node.sceneNode.matrix );
			}
			
			if(pointcloud.showBoundingBox && !node.boundingBoxNode){
				var boxHelper = new THREE.BoxHelper(node.sceneNode);
				pointcloud.add(boxHelper);
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
			}else if(pointcloud.showBoundingBox){
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
			}else if(!pointcloud.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = false;
			}
			
			if(pointcloud.generateDEM && node.level <= 2){
				if(!node.dem){
					node.dem = pointcloud.createDEM(node);
				}
			}
		} 
		
		
		// add child nodes to priorityQueue
		for(var i = 0; i < 8; i++){
			if(!node.children[i]){
				continue;
			}
			
			var child = node.children[i];
			
			var sphere = child.boundingSphere;
			var distance = sphere.center.distanceTo(camObjPos);
			var radius = sphere.radius;
			
			var fov = camera.fov / 2 * Math.PI / 180.0;
			var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
			
			var screenPixelRadius = renderer.domElement.clientHeight * pr;
			if(screenPixelRadius < pointcloud.minimumNodePixelSize){
				continue;
			}
			
			var weight = pr;
			if(distance - radius < 0){
				weight = Number.MAX_VALUE;
			}
			
			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}
		
		
	}// end priority queue loop
	
	for(var i = 0; i < Math.min(5, unloadedGeometry.length); i++){
		unloadedGeometry[i].load();
	}
	
	return {visibleNodes: visibleNodes, numVisiblePoints: numVisiblePoints};
};











