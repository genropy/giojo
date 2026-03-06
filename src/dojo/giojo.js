if(!dojo._hasResource["dojo.giojo"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.giojo"] = true;
dojo.provide("dojo.giojo");

// giojo namespace - Giojo.js extensions
if(typeof giojo === "undefined"){
	giojo = {};
}

giojo.dom = {
	getDomNode: function(what){
		if(typeof what == "string"){
			what = dojo.byId(what);
		}
		if(!what){
			return null;
		}
		if(what.domNode){
			what = what.domNode;
		}
		return what;
	},

	isVisible: function(what){
		what = giojo.dom.getDomNode(what);
		if(what){
			var cs = dojo.getComputedStyle(what);
			if(!cs || cs.display == "none" || cs.visibility == "hidden"){
				return false;
			}
			if(what.clientHeight == 0 || what.clientWidth == 0){
				return false;
			}
			return true;
		}
		return false;
	}
};

}
