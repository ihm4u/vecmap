/*\
title: $:/plugins/ihm/widgets/tidgraph.js
type: application/javascript
module-type: widget

Tidgraph widget to render HTML5/SVG graph of tiddlers

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var TidgraphWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

var utils = require("$:/plugins/ihm/tidgraph/utils.js");

/*Inherit from the base widget class */
TidgraphWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
TidgraphWidget.prototype.render = function(parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

    // Create container divs
    var div = this.document.createElement("div");
    div.className =  "tgr-container tgr";
    var svgdiv = this.document.createElement("div");
    svgdiv.className = "tgr-svg-int";
    div.appendChild(svgdiv);
    var tablediv = this.document.createElement("div");
    div.appendChild(tablediv);
    parent.insertBefore(div,nextSibling);
    this.domNodes.push(div);

    // Construct a table starting at the root tiddler
    this.tidtree = [];
    this.tidtree.mode = this.mode;
    this.tidtree.maxdepth = this.maxdepth;
    this.tidtree.startat = this.startat;
    this.tidtree.nodetitle = this.nodetitle;
    this.tidtree.tooltip = this.tooltip;
    this.tidtree.filter = this.filter;

    //We need to redraw arrows if sidebar is closed/opened
    //this variable is used to check if sidebar status has changed on refresh
    this.sidebar = $tw.wiki.getTiddlerText("$:/state/sidebar");
    var tbl = utils.buildTable(this.startTid,this.tidtree);

    // Add the table and the SVG to the DOM 
    tablediv.innerHTML = tbl;
    svgdiv.innerHTML = utils.buildSVG(div,this.tidtree);

    //Handle window resize
    if (window.onresize && this.oldresize == undefined ) 
       this.oldresize = window.onresize;

    var timeOut = null;
    var self = this;

    var resize_updateSVG = function() { 
       svgdiv.innerHTML = utils.buildSVG(div,self.tidtree);
       if (self.oldresize) self.oldresize();
    }

    var scroll_updateSVG = function() { 
       svgdiv.innerHTML = utils.buildSVG(div,self.tidtree);
    }

    div.onscroll = function(){
       if(!self.scroll_to) clearTimeout(self.scroll_to);
       self.scroll_to = setTimeout(scroll_updateSVG, 100);
    }
    window.onresize = function(){
       if(!self.resize_to) clearTimeout(self.resize_to);
       self.resize_to = setTimeout(resize_updateSVG, 100);
    }
    
    //DEBUG console.log("widget = ",this);
}

/*
Compute the internal state of the widget
*/
TidgraphWidget.prototype.execute = function() {
	// Get parameters from our attributes
    this.startTid = this.getAttribute("start");
	 this.mode = this.getAttribute("mode","tagging").toLowerCase();
    this.maxdepth = parseInt(this.getAttribute("maxdepth","10"));
    this.startat = this.getAttribute("startat","0");
    this.nodetitle = this.getAttribute("nodetitle");
    this.tooltip = this.getAttribute("tooltip","summary");
    this.filter  = this.getAttribute("filter","[!is[system]]");
  

    if ( ["tagging","linking"].indexOf(this.mode) == -1 ) this.mode="tagging";

	// FIXME: We could build the descendant tree here?
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
TidgraphWidget.prototype.refresh = function(changedTiddlers) {
    //DEBUG   console.log("changedtiddlers=",changedTiddlers);

    //Set dirty flag if children have changed
    var dirty=false,t;
    this.computeAttributes();
    this.execute();
    for(t in changedTiddlers) {
        if ( document.getElementById(this.tidtree.id+'-'+escape(t)) ||  //for deletion/change
            utils.isDescendant(t,this.startTid,this.tidtree) )  //for addition 
        {
           //DEBUG console.log(`change triggered by "${t}"`);
           dirty = true;
           break;
        }
    }

    // Refresh if sidebar has been closed/opened since previous rendering
    var sb = $tw.wiki.getTiddlerText("$:/state/sidebar")
    if (sb !== this.sidebar) 
       dirty = true;

    //Refresh if dirty
    if (dirty) {
       this.refreshSelf();
       return true;
    } else {
       return false;
    }
};

exports.tidgraph = TidgraphWidget;

})();
