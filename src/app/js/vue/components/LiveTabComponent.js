
var LiveTabComponent = { 
	template: '#LiveTab-template',
	mounted : function() {
	 	// setTimeout(PR.prettyPrint, 10);
	 	this.triggerRefresh();
	},
	data : function() {
		return {
			liveQuery : 'SELECT Title, Preamble, Image FROM [Pages] WHERE [Preamble] LIKE ? OR [Preamble] IS NULL',
			liveTimeout : null,
			parameters : [{type : "Text", value : "%Press release%", "name" : "@param0"}],
			calculatedScript : "",
			camlXml : '',
			camlRawXml : ''
		}
	},
	computed : {
		 compressedQuery : function() {
		 	if (this.liveQuery)
		 		return LZString.compressToEncodedURIComponent(JSON.stringify({
		 			query : this.liveQuery,
		 			param : this.parameters
		 		}));
		 	return "";
		 }
	}, 
	watch: {	
	    '$route' : function(to, from) {
	      // react to route changes...
	       this.triggerRefresh();
	    },
	    'liveQuery' : function(newValue) {
	    	this.triggerRefresh();
	    },
	    'calculatedScript' : function() {
				var f = document.querySelectorAll('pre.prettyprinted');
	    		for (var i=0; i < f.length;i++) {
	    			f[i].classList.remove('prettyprinted');	    			
	    		}
	    		setTimeout(PR.prettyPrint, 50);
	    }
	  },
	  methods : {
	  	paramError : function(param) {
	  		if (param.type == "Number" && isNaN(Number(param.value))) {
	  			return "That's not a number";
	  		} else if (param.type == "Today" && isNaN(Number(param.value))) {
	  			return "Set a positive number for adding days, or a negative to subtract.";
	  		}
	  	},
	  	triggerRefresh : function() {
	  		var self = this;
	    	if(this.liveTimeout) clearTimeout(this.liveTimeout);

	    	this.liveTimeout = setTimeout(function() {
	    

				var theQuery = self.liveQuery.replace(/[\n\r]/g, " ");
	    		theQuery = theQuery.replace(/\s{2,}/g, ' ');
	    		theQuery = theQuery.replace(/^\s+|\s+$/, '');

	    		var query = camlsql.prepare(theQuery, [], true),
	    			macros  = query._properties.macros;

	    		function findParameterIndexByMacroName(parameters, macro) {
	    			for (var i=0; i <  parameters.length; i++) {
	    				if (parameters[i].name == macro) {
	    					return i;
	    				}
	    			}
	    			return -1;
	    		}
	    		var newparams = [];
	    		if (macros) {
		    		for (var i=0; i < macros.length; i++) {
		    			var ix = findParameterIndexByMacroName(self.parameters, macros[i]);
		    			if (ix === -1) {
		    				console.log("add", macros[i]);
		    				self.parameters.push({name : macros[i], value : "", type : "Text"});
		    			}
		    		}

		    		for (var i=0; i < self.parameters.length; i++) {
		    			if (macros.indexOf(self.parameters[i].name) !== -1) {
		    				newparams.push(self.parameters[i]);
		    			}
		    		}

		    		
		    	}

		    	console.warn("oldparam", self.parameters);
self.parameters = newparams;
	    		
	    		self.$router.push({ name: 'live-hash', params: { hash: self.compressedQuery }})

	    		var parameterCode = "",
	    			ps = self.parameters,
	    			actualParams = [];

	    		for (var i=0; i<  ps.length; i++) {
	    			console.log("ps", ps[i]);
	    			if (parameterCode) parameterCode += ",\n";
	    			if (ps[i].type == "Text") {
	    				parameterCode += " " + JSON.stringify(ps[i].value);
	    				actualParams.push(ps[i].value);
	    			} else if (ps[i].type == "Number") {
	    				parameterCode += " " + Number(ps[i].value);
	    				actualParams.push(Number(ps[i].value));
	    			} else if (ps[i].type == "Today") {
	    				var n = Number(ps[i].value);
	    				parameterCode += " camlsql.today(" + (ps[i].value ? (isNaN(n) ? n : 0) : '') +")";
	    				actualParams.push(ps[i].value && !isNaN(n) ? camlsql.today(n) : camlsql.today());
	    			} 
	    		}

	    		console.warn("actualParams", actualParams, ps);

	    		if(parameterCode) parameterCode = ",\n[\n" + parameterCode + "\n]";
	    		var q = camlsql.prepare(theQuery, actualParams, true);
	    		self.camlRawXml = q.getXml();
	    		self.camlXml = vkbeautify.xml(self.camlRawXml);
	    		self.calculatedScript = "camlsql.prepare(" + JSON.stringify(theQuery) + parameterCode + ");";
	    		self.liveTimeout = null;
	    		var f = document.querySelectorAll('pre.prettyprinted');
	    		for (var i=0; i < f.length;i++) {
	    			f[i].classList.remove('prettyprinted');	    			
	    		}
	    		PR.prettyPrint();
	    	}, 500);
	  	}
	  }
}


