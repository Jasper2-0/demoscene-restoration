// create separate namespace for all the Emscripten stuff.. otherwise naming clashes may occur especially when 
// optimizing using closure compiler..
window.spp_backend_state_IXS= {
	locateFile: function(path, scriptDirectory) { return (typeof window.WASM_SEARCH_PATH == 'undefined') ? path : window.WASM_SEARCH_PATH + path; },
	notReady: true,
	adapterCallback: function(){}	// overwritten later	
};
window.spp_backend_state_IXS["onRuntimeInitialized"] = function() {	// emscripten callback needed in case async init is used (e.g. for WASM)
	this.notReady= false;
	this.adapterCallback();
}.bind(window.spp_backend_state_IXS);


// needed to pass unchanged binary data from C to JS
window.rawBytes= function(module, ptr, len) {
	var ret= [];	
	for (i = 0; i<len; i++) {
		var ch = module.getValue(ptr++, 'i8', true);
		ret.push(ch & 0xff);
	}
	return new Uint8Array(ret);
}

var backend_IXS = (function(Module) {var b;b||(b=typeof Module !== 'undefined' ? Module : {});var m={},n;for(n in b)b.hasOwnProperty(n)&&(m[n]=b[n]);b.arguments=[];b.thisProgram="./this.program";b.quit=function(a,c){throw c;};b.preRun=[];b.postRun=[];var p=!1,q=!1,r=!1,t=!1;p="object"===typeof window;q="function"===typeof importScripts;r="object"===typeof process&&"function"===typeof require&&!p&&!q;t=!p&&!r&&!q;var u="";function v(a){return b.locateFile?b.locateFile(a,u):u+a}
if(r){u=__dirname+"/";var w,x;b.read=function(a,c){w||(w=require("fs"));x||(x=require("path"));a=x.normalize(a);a=w.readFileSync(a);return c?a:a.toString()};b.readBinary=function(a){a=b.read(a,!0);a.buffer||(a=new Uint8Array(a));assert(a.buffer);return a};1<process.argv.length&&(b.thisProgram=process.argv[1].replace(/\\/g,"/"));b.arguments=process.argv.slice(2);"undefined"!==typeof module&&(module.exports=b);process.on("uncaughtException",function(a){if(!(a instanceof y))throw a;});process.on("unhandledRejection",
z);b.quit=function(a){process.exit(a)};b.inspect=function(){return"[Emscripten Module object]"}}else if(t)"undefined"!=typeof read&&(b.read=function(a){return read(a)}),b.readBinary=function(a){if("function"===typeof readbuffer)return new Uint8Array(readbuffer(a));a=read(a,"binary");assert("object"===typeof a);return a},"undefined"!=typeof scriptArgs?b.arguments=scriptArgs:"undefined"!=typeof arguments&&(b.arguments=arguments),"function"===typeof quit&&(b.quit=function(a){quit(a)});else if(p||q)q?
u=self.location.href:document.currentScript&&(u=document.currentScript.src),u=0!==u.indexOf("blob:")?u.substr(0,u.lastIndexOf("/")+1):"",b.read=function(a){var c=new XMLHttpRequest;c.open("GET",a,!1);c.send(null);return c.responseText},q&&(b.readBinary=function(a){var c=new XMLHttpRequest;c.open("GET",a,!1);c.responseType="arraybuffer";c.send(null);return new Uint8Array(c.response)}),b.readAsync=function(a,c,e){var d=new XMLHttpRequest;d.open("GET",a,!0);d.responseType="arraybuffer";d.onload=function(){200==
d.status||0==d.status&&d.response?c(d.response):e()};d.onerror=e;d.send(null)},b.setWindowTitle=function(a){document.title=a};var A=b.print||("undefined"!==typeof console?console.log.bind(console):"undefined"!==typeof print?print:null),B=b.printErr||("undefined"!==typeof printErr?printErr:"undefined"!==typeof console&&console.warn.bind(console)||A);for(n in m)m.hasOwnProperty(n)&&(b[n]=m[n]);m=void 0;function aa(a){var c;c||(c=16);return Math.ceil(a/c)*c}
var ba={"f64-rem":function(a,c){return a%c},"debugger":function(){debugger}},C=!1;function assert(a,c){a||z("Assertion failed: "+c)}
var fa={stackSave:function(){ca()},stackRestore:function(){da()},arrayToC:function(a){var c=ea(a.length);D.set(a,c);return c},stringToC:function(a){var c=0;if(null!==a&&void 0!==a&&0!==a){var e=(a.length<<2)+1;c=ea(e);var d=c,g=E;if(0<e){e=d+e-1;for(var h=0;h<a.length;++h){var f=a.charCodeAt(h);if(55296<=f&&57343>=f){var k=a.charCodeAt(++h);f=65536+((f&1023)<<10)|k&1023}if(127>=f){if(d>=e)break;g[d++]=f}else{if(2047>=f){if(d+1>=e)break;g[d++]=192|f>>6}else{if(65535>=f){if(d+2>=e)break;g[d++]=224|
f>>12}else{if(2097151>=f){if(d+3>=e)break;g[d++]=240|f>>18}else{if(67108863>=f){if(d+4>=e)break;g[d++]=248|f>>24}else{if(d+5>=e)break;g[d++]=252|f>>30;g[d++]=128|f>>24&63}g[d++]=128|f>>18&63}g[d++]=128|f>>12&63}g[d++]=128|f>>6&63}g[d++]=128|f&63}}g[d]=0}}return c}},ha={string:fa.stringToC,array:fa.arrayToC};
function F(a,c){if(0===c||!a)return"";for(var e=0,d,g=0;;){d=E[a+g>>0];e|=d;if(0==d&&!c)break;g++;if(c&&g==c)break}c||(c=g);d="";if(128>e){for(;0<c;)e=String.fromCharCode.apply(String,E.subarray(a,a+Math.min(c,1024))),d=d?d+e:e,a+=1024,c-=1024;return d}return ia(E,a)}var ja="undefined"!==typeof TextDecoder?new TextDecoder("utf8"):void 0;
function ia(a,c){for(var e=c;a[e];)++e;if(16<e-c&&a.subarray&&ja)return ja.decode(a.subarray(c,e));for(e="";;){var d=a[c++];if(!d)return e;if(d&128){var g=a[c++]&63;if(192==(d&224))e+=String.fromCharCode((d&31)<<6|g);else{var h=a[c++]&63;if(224==(d&240))d=(d&15)<<12|g<<6|h;else{var f=a[c++]&63;if(240==(d&248))d=(d&7)<<18|g<<12|h<<6|f;else{var k=a[c++]&63;if(248==(d&252))d=(d&3)<<24|g<<18|h<<12|f<<6|k;else{var l=a[c++]&63;d=(d&1)<<30|g<<24|h<<18|f<<12|k<<6|l}}}65536>d?e+=String.fromCharCode(d):(d-=
65536,e+=String.fromCharCode(55296|d>>10,56320|d&1023))}}else e+=String.fromCharCode(d)}}"undefined"!==typeof TextDecoder&&new TextDecoder("utf-16le");var buffer,D,E,ka,G,la,ma;function na(){b.HEAP8=D=new Int8Array(buffer);b.HEAP16=ka=new Int16Array(buffer);b.HEAP32=G=new Int32Array(buffer);b.HEAPU8=E=new Uint8Array(buffer);b.HEAPU16=new Uint16Array(buffer);b.HEAPU32=new Uint32Array(buffer);b.HEAPF32=la=new Float32Array(buffer);b.HEAPF64=ma=new Float64Array(buffer)}var H,I,J,K,L,N,O;
H=I=J=K=L=N=O=0;function oa(){z("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value "+P+", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")}var Q=b.TOTAL_STACK||5242880,P=b.TOTAL_MEMORY||335544320;P<Q&&B("TOTAL_MEMORY should be larger than TOTAL_STACK, was "+P+"! (TOTAL_STACK="+Q+")");
b.buffer?buffer=b.buffer:("object"===typeof WebAssembly&&"function"===typeof WebAssembly.Memory?(b.wasmMemory=new WebAssembly.Memory({initial:P/65536,maximum:P/65536}),buffer=b.wasmMemory.buffer):buffer=new ArrayBuffer(P),b.buffer=buffer);na();function R(a){for(;0<a.length;){var c=a.shift();if("function"==typeof c)c();else{var e=c.m;"number"===typeof e?void 0===c.a?b.dynCall_v(e):b.dynCall_vi(e,c.a):e(void 0===c.a?null:c.a)}}}var pa=[],qa=[],ra=[],sa=[],ta=[],ua=!1;
function va(){var a=b.preRun.shift();pa.unshift(a)}var S=0,T=null,U=null;b.preloadedImages={};b.preloadedAudios={};function V(a){return String.prototype.startsWith?a.startsWith("data:application/octet-stream;base64,"):0===a.indexOf("data:application/octet-stream;base64,")}
(function(){function a(){try{if(b.wasmBinary)return new Uint8Array(b.wasmBinary);if(b.readBinary)return b.readBinary(g);throw"both async and sync fetching of the wasm failed";}catch(M){z(M)}}function c(){return b.wasmBinary||!p&&!q||"function"!==typeof fetch?new Promise(function(c){c(a())}):fetch(g,{credentials:"same-origin"}).then(function(a){if(!a.ok)throw"failed to load wasm binary file at '"+g+"'";return a.arrayBuffer()}).catch(function(){return a()})}function e(a){function d(a){k=a.exports;if(k.memory){a=
k.memory;var c=b.buffer;a.byteLength<c.byteLength&&B("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");c=new Int8Array(c);(new Int8Array(a)).set(c);b.buffer=buffer=a;na()}b.asm=k;b.usingWasm=!0;S--;b.monitorRunDependencies&&b.monitorRunDependencies(S);0==S&&(null!==T&&(clearInterval(T),T=null),U&&(a=U,U=null,a()))}function e(a){d(a.instance)}function M(a){c().then(function(a){return WebAssembly.instantiate(a,f)}).then(a,function(a){B("failed to asynchronously prepare wasm: "+
a);z(a)})}if("object"!==typeof WebAssembly)return B("no native wasm support detected"),!1;if(!(b.wasmMemory instanceof WebAssembly.Memory))return B("no native wasm Memory in use"),!1;a.memory=b.wasmMemory;f.global={NaN:NaN,Infinity:Infinity};f["global.Math"]=Math;f.env=a;S++;b.monitorRunDependencies&&b.monitorRunDependencies(S);if(b.instantiateWasm)try{return b.instantiateWasm(f,d)}catch(ya){return B("Module.instantiateWasm callback failed with error: "+ya),!1}b.wasmBinary||"function"!==typeof WebAssembly.instantiateStreaming||
V(g)||"function"!==typeof fetch?M(e):WebAssembly.instantiateStreaming(fetch(g,{credentials:"same-origin"}),f).then(e,function(a){B("wasm streaming compile failed: "+a);B("falling back to ArrayBuffer instantiation");M(e)});return{}}var d="ixs.wast",g="ixs.wasm",h="ixs.temp.asm.js";V(d)||(d=v(d));V(g)||(g=v(g));V(h)||(h=v(h));var f={global:null,env:null,asm2wasm:ba,parent:b},k=null;b.asmPreload=b.asm;var l=b.reallocBuffer;b.reallocBuffer=function(a){if("asmjs"===za)var c=l(a);else a:{var d=b.usingWasm?
65536:16777216;0<a%d&&(a+=d-a%d);d=b.buffer.byteLength;if(b.usingWasm)try{c=-1!==b.wasmMemory.grow((a-d)/65536)?b.buffer=b.wasmMemory.buffer:null;break a}catch(Ea){c=null;break a}c=void 0}return c};var za="";b.asm=function(a,c){if(!c.table){a=b.wasmTableSize;void 0===a&&(a=1024);var d=b.wasmMaxTableSize;c.table="object"===typeof WebAssembly&&"function"===typeof WebAssembly.Table?void 0!==d?new WebAssembly.Table({initial:a,maximum:d,element:"anyfunc"}):new WebAssembly.Table({initial:a,element:"anyfunc"}):
Array(a);b.wasmTable=c.table}c.memoryBase||(c.memoryBase=b.STATIC_BASE);c.tableBase||(c.tableBase=0);c=e(c);assert(c,"no binaryen method succeeded.");return c}})();H=1024;I=H+37168;qa.push();b.STATIC_BASE=H;b.STATIC_BUMP=37168;I+=16;var W=0;function X(){W+=4;return G[W-4>>2]}var wa={};
function Y(a,c){W=c;try{var e=X(),d=X(),g=X();a=0;Y.c||(Y.c=[null,[],[]],Y.i=function(a,c){var d=Y.c[a];assert(d);0===c||10===c?((1===a?A:B)(ia(d,0)),d.length=0):d.push(c)});for(c=0;c<g;c++){for(var h=G[d+8*c>>2],f=G[d+(8*c+4)>>2],k=0;k<f;k++)Y.i(e,E[h+k]);a+=f}return a}catch(l){return"undefined"!==typeof FS&&l instanceof FS.b||z(l),-l.f}}function xa(a){return Math.pow(2,a)}var Aa=I;I=I+4+15&-16;O=Aa;J=K=aa(I);L=J+Q;N=aa(L);G[O>>2]=N;b.wasmTableSize=85;b.wasmMaxTableSize=85;b.g={};
b.h={abort:z,enlargeMemory:function(){oa()},getTotalMemory:function(){return P},abortOnCannotGrowMemory:oa,_JS_getCacheFileData:function(a,c,e,d,g,h){var f=F(a);a=window.ixs_getCached(f);if(null!=a){for(var k=window.ixs_HEAP8,l=0;l<a.length;l++)k[h+l]=a[l];return a.length}window.request=indexedDB.open("ixs_cache_db",3);window.request.onupgradeneeded=function(a){var c=a.target.result;0<a.oldVersion&&c.deleteObjectStore("ixs_cache_os");a=c.createObjectStore("ixs_cache_os",{keyPath:"id",autoIncrement:!0});
a.createIndex("filename","filename",{unique:!0});a.createIndex("data","data",{unique:!1})};window.request.onsuccess=function(){var a=window.request.result.transaction("ixs_cache_os").objectStore("ixs_cache_os").index("filename").get(f);a.onsuccess=function(){var h=a.result;if(void 0!==h)window.ixs_asyncSetFileData(f,h.data);else{h=window.rawBytes(b,c,e);var k=window.rawBytes(b,d,g);window.wavegenWorker.postMessage({generate:[f,h,k]})}}};return 0},_JS_printStatus:function(a){a=F(a);var c=window.ScriptNodePlayer.getInstance();
if(c.isReady())return c._songUpdateCallback(a);window.console.log("error: JS_printStatus not ready")},___setErrNo:function(a){b.___errno_location&&(G[b.___errno_location()>>2]=a);return a},___syscall140:function(a,c){W=c;try{var e=wa.j();X();var d=X(),g=X(),h=X();FS.o(e,d,h);G[g>>2]=e.position;e.l&&0===d&&0===h&&(e.l=null);return 0}catch(f){return"undefined"!==typeof FS&&f instanceof FS.b||z(f),-f.f}},___syscall146:Y,___syscall6:function(a,c){W=c;try{var e=wa.j();FS.close(e);return 0}catch(d){return"undefined"!==
typeof FS&&d instanceof FS.b||z(d),-d.f}},_abort:function(){b.abort()},_emscripten_memcpy_big:function(a,c,e){E.set(E.subarray(c,c+e),a);return a},_exit:function(a){if(!b.noExitRuntime&&(C=!0,K=Ba,R(sa),b.onExit))b.onExit(a);b.quit(a,new y(a))},_llvm_exp2_f64:function(){return xa.apply(null,arguments)},DYNAMICTOP_PTR:O,STACKTOP:K};var Ca=b.asm(b.g,b.h,buffer);b.asm=Ca;b.___errno_location=function(){return b.asm.___errno_location.apply(null,arguments)};
b._emu_compute_audio_samples=function(){return b.asm._emu_compute_audio_samples.apply(null,arguments)};b._emu_get_audio_buffer=function(){return b.asm._emu_get_audio_buffer.apply(null,arguments)};b._emu_get_audio_buffer_length=function(){return b.asm._emu_get_audio_buffer_length.apply(null,arguments)};b._emu_get_sample_rate=function(){return b.asm._emu_get_sample_rate.apply(null,arguments)};b._emu_get_song_title=function(){return b.asm._emu_get_song_title.apply(null,arguments)};
b._emu_get_trace_streams=function(){return b.asm._emu_get_trace_streams.apply(null,arguments)};b._emu_load_file=function(){return b.asm._emu_load_file.apply(null,arguments)};b._emu_number_trace_streams=function(){return b.asm._emu_number_trace_streams.apply(null,arguments)};b._emu_set_quality=function(){return b.asm._emu_set_quality.apply(null,arguments)};b._emu_teardown=function(){return b.asm._emu_teardown.apply(null,arguments)};b._free=function(){return b.asm._free.apply(null,arguments)};
b._ldexp=function(){return b.asm._ldexp.apply(null,arguments)};b._malloc=function(){return b.asm._malloc.apply(null,arguments)};var ea=b.stackAlloc=function(){return b.asm.stackAlloc.apply(null,arguments)},da=b.stackRestore=function(){return b.asm.stackRestore.apply(null,arguments)},ca=b.stackSave=function(){return b.asm.stackSave.apply(null,arguments)};b.dynCall_v=function(){return b.asm.dynCall_v.apply(null,arguments)};b.dynCall_vi=function(){return b.asm.dynCall_vi.apply(null,arguments)};
b.asm=Ca;b.ccall=function(a,c,e,d){var g=b["_"+a];assert(g,"Cannot call unknown function "+a+", make sure it is exported");var h=[];a=0;if(d)for(var f=0;f<d.length;f++){var k=ha[e[f]];k?(0===a&&(a=ca()),h[f]=k(d[f])):h[f]=d[f]}e=g.apply(null,h);e="string"===c?F(e):"boolean"===c?!!e:e;0!==a&&da(a);return e};
b.getValue=function(a,c){c=c||"i8";"*"===c.charAt(c.length-1)&&(c="i32");switch(c){case "i1":return D[a>>0];case "i8":return D[a>>0];case "i16":return ka[a>>1];case "i32":return G[a>>2];case "i64":return G[a>>2];case "float":return la[a>>2];case "double":return ma[a>>3];default:z("invalid type for getValue: "+c)}return null};b.Pointer_stringify=F;function y(a){this.name="ExitStatus";this.message="Program terminated with exit("+a+")";this.status=a}y.prototype=Error();y.prototype.constructor=y;var Ba;
U=function Da(){b.calledRun||Z();b.calledRun||(U=Da)};
function Z(){function a(){if(!b.calledRun&&(b.calledRun=!0,!C)){ua||(ua=!0,R(qa));R(ra);if(b.onRuntimeInitialized)b.onRuntimeInitialized();if(b.postRun)for("function"==typeof b.postRun&&(b.postRun=[b.postRun]);b.postRun.length;){var a=b.postRun.shift();ta.unshift(a)}R(ta)}}if(!(0<S)){if(b.preRun)for("function"==typeof b.preRun&&(b.preRun=[b.preRun]);b.preRun.length;)va();R(pa);0<S||b.calledRun||(b.setStatus?(b.setStatus("Running..."),setTimeout(function(){setTimeout(function(){b.setStatus("")},1);
a()},1)):a())}}b.run=Z;function z(a){if(b.onAbort)b.onAbort(a);void 0!==a?(A(a),B(a),a=JSON.stringify(a)):a="";C=!0;throw"abort("+a+"). Build with -s ASSERTIONS=1 for more info.";}b.abort=z;if(b.preInit)for("function"==typeof b.preInit&&(b.preInit=[b.preInit]);0<b.preInit.length;)b.preInit.pop()();b.noExitRuntime=!0;Z();
  return {
	Module: Module,  // expose original Module
  };
})(window.spp_backend_state_IXS);
/*
 ixs_adapter.js: Adapts Ixalance (IXS) backend to generic WebAudio/ScriptProcessor player.

	Known limitation: The used ScriptNodePlayer was not designed for Workers but expects
	that all file loading occurs via XHR. Consequently integrating the Worker used here
	is a hack (and the ScriptNodePlayer also had to be patched up).

	IXS does not need to load separate files but instead generates a "cached sample file"
	during load the respective "Worker" based laod is somewhat hacked into this impl..

 	Copyright (C) 2022-2023 Juergen Wothke

 LICENSE

	 This software is licensed under a CC BY-NC-SA
	 (http://creativecommons.org/licenses/by-nc-sa/4.0/).
*/

class IXSBackendAdapter extends EmsHEAP16BackendAdapter {
	constructor(logCallback)
	{
		super(backend_IXS.Module, 2, new SimpleFileMapper(backend_IXS.Module),
					new HEAP16ScopeProvider(backend_IXS.Module, 0x8000));

		this._log = typeof logCallback == 'function' ? logCallback : function(ignoreMsg) {};
		this._songSize = 0;

		this.setProcessorBufSize(16384/4);	// "the x.whales" does not like smaller buffer

		let path = 'wavegen_ixs.js';
		path =  (typeof window.WASM_SEARCH_PATH == 'undefined') ? path : window.WASM_SEARCH_PATH + path;
		
		this.wavegenWorker = new Worker(path);
		this.wavegenWorker.onmessage = function(oEvent) {

			if (oEvent.data instanceof Object)
			{
				if (oEvent.data.hasOwnProperty('logMsg'))
				{
					this._log(oEvent.data.logMsg);

				}
				else if (oEvent.data.hasOwnProperty('cacheReady'))
				{
					// like the async notification of a XHR response.. now the
					// player can be triggered to "retry"
					let filename = oEvent.data.cacheReady;
					this._loadFileDataFromDB(filename);
				}
				else
				{
					// above should be the only messages
				}
			}

		}.bind(this);
		// must unfortunately be registered as a global var so that the
		// code in callback.js can access it..
		window.wavegenWorker = this.wavegenWorker;

		this.ensureReadyNotification();
	}

	// using the browser's DB feature to store the generated "temp cache files"
	// so that all future page loads are much faster
	_loadFileDataFromDB(filename)
	{
		window.request = indexedDB.open('ixs_cache_db', 3);
		window.request.onupgradeneeded = function(e) {
			let db = e.target.result;

			if (e.oldVersion > 0)
			{
				db.deleteObjectStore('ixs_cache_os');
			}

			let objectStore = db.createObjectStore('ixs_cache_os', { keyPath: 'id', autoIncrement:true });

			objectStore.createIndex('filename', 'filename', { unique: true });
			objectStore.createIndex('data', 'data', { unique: false });
		};
		window.request.onsuccess = function() {
			let db = window.request.result;

			let store = db.transaction('ixs_cache_os').objectStore('ixs_cache_os');
			let index = store.index("filename");

			let r = index.get(filename);
			r.onsuccess = function() {
				let matching = r.result;
				if (matching !== undefined)
				{
					ScriptNodePlayer.getInstance().asyncSetFileData(filename, matching.data);
				}
				else
				{
					console.log("ERROR: advertised DB entry not found: "+filename);
				}
			};
		};
		return 0;	// data isn't available yet and a "retry" is needed later
	}

	loadMusicData(sampleRate, path, filename, data, options)
	{
		let p = ScriptNodePlayer.getInstance();
		// what ugly garbage! but it is needed for access from callback.js :-(
		window["ixs_getCached"] = p.getCached.bind(p);
		window["ixs_asyncSetFileData"] = p.asyncSetFileData.bind(p);
		window["ixs_HEAP8"] = this.Module.HEAP8;

		this._songSize = data.length;


		filename = this._getFilename(path, filename);

		let ret = this._loadMusicDataBuffer(filename, data, ScriptNodePlayer.getWebAudioSampleRate(), -9999, true);

		if (ret == 0)
		{
			this._setupOutputResampling(sampleRate);
		}
		return ret;
	}

	updateSongInfo(filename)
	{
		this._songInfo = new Object();
		this._songInfo.title = this.Module.ccall('emu_get_song_title', 'string');;
		this._songInfo.songSize = this._songSize;
	}
/*
	getSongInfo()
	{
		return this._songInfo;
	}
*/
	getSongInfoMeta()
	{
		return {
			title: String,
			songSize: Number
		};
	}

	// in IXS context this is just used to propagate "log" messages to the UI.
	// triggered via window['songUpdateCallback'] call in callback.js
	handleBackendSongAttributes(msg)
	{
		if (typeof this._log != 'undefined')
		{
			this._log(msg);
		}
	}

	// selects the used output generation impl (high means stereo+)
	setQuality(highEnabled)
	{
		this.Module.ccall('emu_set_quality', 'number', ['number'], [highEnabled]);
	}

	// disable unsupported default impls

	getMaxPlaybackPosition()
	{
		return -1;
	}
	getPlaybackPosition()
	{
		return -1;
	}
	seekPlaybackPosition(ms)
	{
	}
}

