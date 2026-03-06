

var genropatches = {};

genropatches.forEachError = function(){
    var fe = dojo.forEach;
    dojo['forEach'] = function(arr,cb,scope){
        if(arr==null){
            if(genro.isDeveloper){
                debugger;
            }else{
                console.error('ERROR FOREACH',arguments,cb);
                return;
            }
        }
        fe.call(dojo,arr,cb,scope);
    }
};

genropatches.indexOfError = function(){
    var fe = dojo.indexOf;
    dojo['indexOf'] = function(arr,object,scope){
        if(object instanceof Date){
            return arr.findIndex(elem=>object.getTime()===elem.getTime());
        }
        return fe.call(dojo,arr,object,scope);
    }
};

genropatches.sendAsBinary=function(){
    if(!XMLHttpRequest.prototype.sendAsBinary){
            XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
                function byteValue(x) {
                    return x.charCodeAt(0) & 0xff;
                }
                var ords = Array.prototype.map.call(datastr, byteValue);
                var ui8a = new Uint8Array(ords);
                this.send(ui8a.buffer);
            }
        }
};
genropatches.dojoToJson = function() {
    dojo.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint, /*String?*/ _indentStr){
        if(it === undefined){
            return "null";
        }
        if(it instanceof gnr.GnrBag){
            console.log('object_to_json',it);
        }

        var objtype = typeof it;
        if(objtype == "number" || objtype == "boolean"){
            return it + "";
        }
        if(it === null){
            return "null";
        }
        if(dojo.isString(it)){
            return dojo._escapeString(it);
        }
        if(it.nodeType && it.cloneNode){ // isNode
            return ""; // FIXME: would something like outerHTML be better here?
        }
        // recurse
        var recurse = arguments.callee;
        // short-circuit for objects that support "json" serialization
        // if they return "self" then just pass-through...
        var newObj;
        _indentStr = _indentStr || "";
        var nextIndent = prettyPrint ? _indentStr + dojo.toJsonIndentStr : "";
        if(typeof it.__json__ == "function"){
            newObj = it.__json__();
            if(it !== newObj){
                return recurse(newObj, prettyPrint, nextIndent);
            }
        }
        if(typeof it.json == "function"){
            newObj = it.json();
            if(it !== newObj){
                return recurse(newObj, prettyPrint, nextIndent);
            }
        }

        var sep = prettyPrint ? " " : "";
        var newLine = prettyPrint ? "\n" : "";

        // array
        if(dojo.isArray(it)){
            var res = dojo.map(it, function(obj){
                var val = recurse(obj, prettyPrint, nextIndent);
                if(typeof val != "string"){
                    val = "null";
                }
                return newLine + nextIndent + val;
            });
            return "[" + res.join("," + sep) + newLine + _indentStr + "]";
        }
        if(objtype == "function"){
            return null; // null
        }
        // generic object code path
        var output = [];
        for(var key in it){
            var keyStr;
            if(typeof key == "number"){
                keyStr = '"' + key + '"';
            }else if(typeof key == "string"){
                keyStr = dojo._escapeString(key);
            }else{
                // skip non-string or number keys
                continue;
            }
            val = recurse(it[key], prettyPrint, nextIndent);
            if(typeof val != "string"){
                // skip non-serializable values
                continue;
            }
            output.push(newLine + nextIndent + keyStr + ":" + sep + val);
        }
        return "{" + output.join("," + sep) + newLine + _indentStr + "}"; // String
    }
};
genropatches.dnd=function(){
    dojo.require("dojo.dnd.Moveable");
    var mvbl = dojo.dnd.Moveable;
    mvbl.prototype.onMouseDown_replaced=mvbl.prototype.onMouseDown;
    mvbl.prototype.onMouseDown= function(e){
        var contextclick = (e.button==2 ||  genro.dom.getEventModifiers(e)=='Ctrl');
        if (!contextclick){
            this.onMouseDown_replaced(e);
        }
    }

};

genropatches.comboBox = function() {
    dojo.require('dijit.form.ComboBox');
    dojo.declare("gnr.Gnr_ComboBoxMenu", dijit.form._ComboBoxMenu, {
        templateString: "<ul class='dijitMenu' dojoAttachEvent='onmousedown:_onMouseDown,onmouseup:_onMouseUp,onmouseout:_onMouseOut' tabIndex='-1' style='overflow:\"auto\";'>"
                + "<li class='dijitMenuItem dijitMenuPreviousButton' dojoAttachPoint='previousButton'></li>"
                + "<li class='dijitMenuItem dijitMenuNextButton' dojoAttachPoint='nextButton'></li>"
                + "</ul>",
        createOptions:function(results, dataObject, labelFunc) {
            var lfa = dataObject.store.lastFetchAttrs;
            var columns = lfa.columns.split(',');
            var headers = lfa.headers.split(',');
            var tblclass = 'multiColumnSelect' + ' ' + lfa.resultClass;
            var tplRow = this.params.auxColumns_template;
            var max_height = null;
            if(tplRow){
                console.log('tplRow',tplRow)
                results.forEach(n=>{
                    n.attr._template_value = dataTemplate(tplRow,n.attr);
                });
                columns = ['_template_value']
                headers = ['*']
                tblclass += ' templateAuxColumns'
                max_height = '400px'

            }
            genro.dom.scrollableTable(this.domNode, results[0].getParentBag(), {'columns':columns,'headers':headers,'tblclass':tblclass,
                                                                                max_height:max_height});
            this.domNode.onmouseover = dojo.hitch(this, 'onmouseover');
        },
        tblrows:function() {
            return dojo.query('tbody tr', this.domNode);
        },

        clearResultList:function() {
            while (this.domNode.childNodes.length > 2) {
                this.domNode.innerHtml = '';
            }
        },
        getItems:function() {
            return this.tblrows();
        },

        getListLength:function() {
            return this.tblrows().length;
        },

        onmouseup:function(/*Event*/ evt) {
            evt.preventDefault();
            dojo.stopEvent(evt);
            if (evt.target === this.domNode) {
                return;
            } else {
                var tgt = this.getHighlightedOption();
                if (tgt) {
                    this.setValue({target:tgt}, true);
                }
                ;
            }
        },

        onmouseover:function(/*Event*/ evt) {
            if (dojo.isIE > 0) {
                return;
            }
            if (evt.target === this.domNode) {
                return;
            }
            var tgt = evt.target;
            if (tgt) {
                if (tgt.getAttribute('id')) {
                    this._focusOptionNode(tgt);
                } else if (tgt.parentNode.getAttribute('id')) {
                    this._focusOptionNode(tgt.parentNode);
                }
            }
            ;

        },
        _page:function(/*Boolean*/ up) {
            return;
        },
        getHighlightedOption:function() {
            return this._highlighted_option;
        },
        _focusOptionNode:function(/*DomNode*/ node) {
            if (this._highlighted_option != node) {
                this._blurOptionNode();
                this._highlighted_option = node;
                dojo.addClass(this._highlighted_option, "multiColumnSelectHover");
            }
        },
        _blurOptionNode:function() {
            if (this._highlighted_option) {
                dojo.removeClass(this._highlighted_option, "multiColumnSelectHover");
                this._highlighted_option = null;
            }
        },
        _highlightNextOption:function() {
            var domnode_bottom = this.domNode.getBoundingClientRect().bottom;
            var nextNode;
            var hop = this.getHighlightedOption();
            if (!this.getHighlightedOption()) {
                nextNode = this.tblrows()[0];
            } else if (hop.nextSibling && hop.style.display != "none") {
                nextNode = hop.nextSibling;
            }
            if (nextNode) {
                brect = nextNode.getBoundingClientRect();
                this._focusOptionNode(nextNode);

                if (brect.bottom > domnode_bottom) {
                    var delta = brect.bottom - brect.top;
                    var scrollTop = this.domNode.children[0].children[1].scrollTop;
                    this.domNode.children[0].children[1].scrollTop = scrollTop + 20;
                }
            }
        },

        highlightFirstOption:function() {
            this._focusOptionNode(this.tblrows()[0]);
        },

        highlightLastOption:function() {
            var rows = this.tblrows();
            this._focusOptionNode(rows[rows.length - 1]);
        },

        _highlightPrevOption:function() {
            if (!this.getHighlightedOption()) {
                var rows = this.tblrows();
                this._focusOptionNode(rows[rows.length - 1]);
            } else if (this._highlighted_option.previousSibling && this._highlighted_option.previousSibling.style.display != "none") {
                this._focusOptionNode(this._highlighted_option.previousSibling);
            }
        },


        handleKey:function(evt) {
            switch (evt.keyCode) {
                case dojo.keys.DOWN_ARROW:
                    this._highlightNextOption();
                    break;
                case dojo.keys.PAGE_DOWN:
                    this.pageDown();
                    break;
                case dojo.keys.UP_ARROW:
                    this._highlightPrevOption();
                    break;
                case dojo.keys.PAGE_UP:
                    this.pageUp();
                    break;
            }
        }
    });


    var dijit_form_ComboBoxMixin_onKeyPress = function(/*Event*/ evt){
            if(evt.altKey || evt.ctrlKey || evt.metaKey){
                console.log('dijit_form_ComboBoxMixin_onKeyPress exit',evt)
                return;
            }
            if(evt.shiftKey){
                let code = evt.code.toLowerCase();
                if(code.includes('shift') || code=='space'){
                    return
                }
            }
            var doSearch = false;
            var pw = this._popupWidget;
            var dk = dojo.keys;
            if(this._isShowingNow){
                pw.handleKey(evt);
            }
            var evt_keycode = evt.keyCode;
            if((evt_keycode==dk.UP_ARROW && evt.keyChar=='&') || (evt_keycode==dk.DOWN_ARROW && evt.keyChar=='(')){
                evt_keycode = 0; //L.A. fix for evt.keyChar=='&'
            }
            switch(evt_keycode){
                case dk.PAGE_DOWN:
                case dk.DOWN_ARROW:
                    if(!this._isShowingNow||this._prev_key_esc){
                        this._arrowPressed();
                        doSearch=true;
                    }else{
                        this._announceOption(pw.getHighlightedOption());
                    }
                    dojo.stopEvent(evt);
                    this._prev_key_backspace = false;
                    this._prev_key_esc = false;
                    break;

                case dk.PAGE_UP:
                case dk.UP_ARROW:
                    if(this._isShowingNow){
                        this._announceOption(pw.getHighlightedOption());
                    }
                    dojo.stopEvent(evt);
                    this._prev_key_backspace = false;
                    this._prev_key_esc = false;
                    break;

                case dk.ENTER:
                    var highlighted;
                    if(! this._isShowingNow){
                        evt.preventDefault();
                        dojo.stopEvent(evt);
                        break;
                    }
                    if( this._isShowingNow &&
                        (highlighted = pw.getHighlightedOption())
                    ){

                        if(highlighted == pw.nextButton){
                            this._nextSearch(1);
                            dojo.stopEvent(evt);
                            break;
                        }else if(highlighted == pw.previousButton){
                            this._nextSearch(-1);
                            dojo.stopEvent(evt);
                            break;
                        }
                    }else{
                        this.setDisplayedValue(this.getDisplayedValue());
                    }
                    evt.preventDefault();

                case dk.TAB:
                    var newvalue = this.getDisplayedValue();
                    if(pw && (
                        newvalue == pw._messages["previousMessage"] ||
                        newvalue == pw._messages["nextMessage"])
                    ){
                        break;
                    }
                    if(this._isShowingNow){
                        this._prev_key_backspace = false;
                        this._prev_key_esc = false;
                        if(pw.getHighlightedOption()){
                            pw.setValue({ target: pw.getHighlightedOption() }, true);
                        }
                        this._hideResultList();
                    }
                    break;

                case dk.ESCAPE:
                    this._prev_key_backspace = false;
                    this._prev_key_esc = true;
                    if(this._isShowingNow){
                        dojo.stopEvent(evt);
                        this._hideResultList();
                    }
                    this.inherited(arguments);
                    break;

                case dk.DELETE:
                case dk.BACKSPACE:
                    this._prev_key_esc = false;
                    this._prev_key_backspace = true;
                    doSearch = true;
                    break;

                case dk.RIGHT_ARROW: // fall through
                case dk.LEFT_ARROW:
                    this._prev_key_backspace = false;
                    this._prev_key_esc = false;
                    break;

                default:
                    this._prev_key_backspace = false;
                    this._prev_key_esc = false;
                    doSearch = true;
            }
            if(this.searchTimer){
                clearTimeout(this.searchTimer);
            }
            if(doSearch){
                setTimeout(dojo.hitch(this, "_startSearchFromInput"),1);
            }
        }
        dijit_form_ComboBoxMixin_onKeyPress.nom='_onKeyPress';
        dijit.form.ComboBoxMixin.prototype.templateString = "<div class=\"dijit dijitReset dijitInlineTable dijitLeft\"\n\tid=\"widget_${id}\"\n\tdojoAttachEvent=\"onmouseenter:_onMouse,onmouseleave:_onMouse,onmousedown:_onMouse\" dojoAttachPoint=\"comboNode\" waiRole=\"combobox\" tabIndex=\"-1\"\n\t><div style=\"overflow:hidden;\"\n\t\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton'\n\t\t\tdojoAttachPoint=\"downArrowNode\" waiRole=\"presentation\"\n\t\t\tdojoAttachEvent=\"onmousedown:_onArrowMouseDown,onmouseup:_onMouse,onmouseenter:_onMouse,onmouseleave:_onMouse\"\n\t\t\t><div class=\"dijitArrowButtonInner\">&thinsp;</div\n\t\t\t><div class=\"dijitArrowButtonChar\">&#9660;</div\n\t\t></div\n\t\t><div class=\"dijitReset dijitValidationIcon\"><br></div\n\t\t><div class=\"dijitReset dijitValidationIconText\">&Chi;</div\n\t\t><div class=\"dijitReset dijitInputField\"\n\t\t\t><input type=\"text\" autocomplete=\"off\" name=\"${name}\" class='dijitReset'\n\t\t\tdojoAttachEvent=\"input:_onKeyPress, onfocus:_update, compositionend,onkeyup\"\n\t\t\tdojoAttachPoint=\"textbox,focusNode\" waiRole=\"textbox\" waiState=\"haspopup-true,autocomplete-list\"\n\t\t/></div\n\t></div\n></div>\n"
        if(genro.isMobile){
            dijit.form.ComboBoxMixin.prototype.templateString = "<div class=\"dijit dijitReset dijitInlineTable dijitLeft\"\n\tid=\"widget_${id}\"\n\tdojoAttachEvent=\"onmouseenter:_onMouse,onmouseleave:_onMouse,onmousedown:_onMouse\" dojoAttachPoint=\"comboNode\" waiRole=\"combobox\" tabIndex=\"-1\"\n\t><div style=\"overflow:hidden;\"\n\t\t><div class='dijitReset dijitRight dijitButtonNode dijitArrowButton dijitDownArrowButton'\n\t\t\tdojoAttachPoint=\"downArrowNode\" waiRole=\"presentation\"\n\t\t\tdojoAttachEvent=\"onmousedown:_onArrowMouseDown,onmouseup:_onMouse,onmouseenter:_onMouse,onmouseleave:_onMouse\"\n\t\t\t><div class=\"dijitArrowButtonInner\">&thinsp;</div\n\t\t\t><div class=\"dijitArrowButtonChar\">&#9660;</div\n\t\t></div\n\t\t><div class=\"dijitReset dijitValidationIcon\"><br></div\n\t\t><div class=\"dijitReset dijitValidationIconText\">&Chi;</div\n\t\t><div class=\"dijitReset dijitInputField\"\n\t\t\t><input type=\"text\" autocomplete=\"off\" name=\"${name}\" class='dijitReset'\n\t\t\tdojoAttachEvent=\"onfocus:_update, compositionend\"\n\t\t\tdojoAttachPoint=\"textbox,focusNode\" waiRole=\"textbox\" waiState=\"haspopup-true,autocomplete-list\"\n\t\t/></div\n\t></div\n></div>\n"
        }
        dijit.form.ComboBoxMixin.prototype._onKeyPress = dijit_form_ComboBoxMixin_onKeyPress;
        dijit.form.ComboBox.prototype._onKeyPress = dijit_form_ComboBoxMixin_onKeyPress;
};

genropatches.tree = function() {
    dojo.require('dijit.Tree');
    dijit.Tree.prototype._expandNode_replaced=dijit.Tree.prototype._expandNode;
    dijit.Tree.prototype._collapseNode_replaced=dijit.Tree.prototype._collapseNode;
    dijit.Tree.prototype._expandNode = function(node) {
        if(node.item && node.item._resolver && node.item._resolver.expired()){
            node.state = 'UNCHECKED';
        }
        if(node.__eventmodifier=='Shift' && node.isExpandable){
            var was_expanded = node.isExpanded;
            this._expandNode_replaced(node);
            if(!was_expanded){
                this.expandAll(node);
            }
        }else{
            return this._expandNode_replaced(node);
        }
    }
    dijit.Tree.prototype._collapseNode = function(node) {
        if(node.item && node.item._resolver && node.item._resolver.expired()){
            node.state = 'UNCHECKED';
        }
        if(node.__eventmodifier=='Shift' && node.isExpandable){
            var was_expanded = node.isExpanded;
            this._collapseNode_replaced(node);
            if(was_expanded){
                this.collapseAll(node);
            }
        }else{
            return this._collapseNode_replaced(node);
        }
    }
    dijit._TreeNode.prototype.setLabelNode = function(label) {
        this.labelNode.innerHTML = "";
        var itemattr = this.item.attr || {};
        if ((typeof(label) == 'string') && (label.indexOf('innerHTML:') >= 0)) {
            this.labelNode.innerHTML = label.replace('innerHTML:', '');
        }
        else {
            this.labelNode.appendChild(dojo.doc.createTextNode(label));
        }
        ;
        if ('node_class' in itemattr) {
            dojo.addClass(this.domNode, itemattr.node_class);
        }
        if (itemattr.tip){
            this.domNode.setAttribute('title',itemattr.tip);
        }
        var sourceNode = this.tree.sourceNode;
        var draggable = sourceNode.attr.draggable;
        if (draggable && (this.item instanceof gnr.GnrBagNode)) {
            this.domNode.setAttribute('draggable', draggable);
        }
    };

};

genropatches.decimalRound = function() {
  function decimalAdjust(type, value, exp) {
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  if (!Math.round10) {
    Math.round10 = function(value, expOrFormat) {
        let exp;
        if(expOrFormat===undefined){
            exp = -2;
        }else if(typeof(expOrFormat)=='string'){
            let decimalPart = expOrFormat.split('.')[1];
            if (decimalPart===undefined){
                exp=0;
            }else{
                exp = -decimalPart.length;
            }
        }else{
            exp = expOrFormat;
        }
        return decimalAdjust('round', value, exp);
    };
  }
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
};
