/*\
title: $:/plugins/ihm/tidgraph/utils.js
type: application/javascript
module-type: library

Internal utility functions for tidgraph plugin.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

function getOffsetRect(elem) {
  var box = elem.getBoundingClientRect()
  var body = document.body
  var docElem = document.documentElement
  var scrollTop = elem.scrollTop || window.pageYOffset || docElem.scrollTop || body.scrollTop
  var scrollLeft = elem.scrollLeft || window.pageXOffset || docElem.scrollLeft || body.scrollLeft
  var clientTop = docElem.clientTop || body.clientTop || 0
  var clientLeft = docElem.clientLeft || body.clientLeft || 0

  var top  = box.top -  scrollTop  - clientTop
  var left = box.left - scrollLeft - clientLeft
  return { top: top, left: left, width: box.width, height: box.height, right: left+box.width, bottom: top+box.height}
}

exports.buildTable = function(rootTid, tidtree) {
  function getTooltip(tid) {
     var ta=$tw.utils.parseStringArray(tidtree.tooltip);
     var len = ta.length,res="";
     for(var i=0; i<len; i++)
        if ( res=tid.getFieldString(ta[i]) ) break;
     return res;
  }

  /*Add children to the unfinished table*/
  var addChildren = function(table) {
     var wiki = $tw.wiki;

     dfvisit(tidtree.root,function(node,acc,currdepth) {
        var tid = wiki.getTiddler(node.id);
        var cnt = 1+countDescendants(node,tidtree);
        var esctitle = escape(node.id);
        var tooltip = tid ? getTooltip(tid):"";
        var title;
        if (tid) {
           if (!tidtree.nodetitle)
              title = tid.hasField("caption") ? tid.fields.caption:tid.fields.title;
           else
              title = tid.getFieldString(tidtree.nodetitle);
        }
        if (currdepth >= tidtree.startat) {
           var tidlink = '<a class="tc-tiddlylink tc-tiddlylink-resolves ihm-tgr-node tgr-node"  href="#'+esctitle+'" id="'+tidtree.id+'-'+esctitle+'"  title="'+tooltip+'">'+title+'</a>';
           table.str = table.str + '<tr><td  rowspan="'+cnt+'">'+tidlink+'</td></tr>';
        }

     },table,{skipvisited:true})
  }

  var   filter, tiddlers = [],
        data = [], out;
  tidtree.id = (new Date()).valueOf();
  tidtree.root = makeTidTree(rootTid,tidtree)
  //DEBUG printtree(tidtree.root,false)
  out = { "str" : '<table id="'+tidtree.id+'-table">' };
  addChildren(out);

  out.str  = out.str  + '</table>';

  //DEBUG console.log(" table = ", out.str, "\ntidtree: ",tidtree);
  console.log("outliers=",tidtree.outliers)
  return out.str;
}

function getPort(tgrdiv,edge,criteria) {
   var el;
   var cont_rect = getOffsetRect(tgrdiv);

   if ( typeof criteria === "string" ) {
       el = document.querySelector(criteria);
   /* FIXME: show error */
   if (el == null) return null;
   } else if (criteria instanceof HTMLElement) el = criteria;

   var el_rect = getOffsetRect(el);
   //DEBUG console.log("el rect=",el_rect,"\ndivrect=",cont_rect);
   
   var r = { "bottom": el_rect.bottom - cont_rect.top,
                 "left":       el_rect.left      - cont_rect.left,
                 "right":     el_rect.right    - cont_rect.left,
                 "top":       el_rect.top      - cont_rect.top };
    var p = "";
    switch (edge.toUpperCase()) {
       case 'L':
          p = [ Math.round(r.left), Math.round(r.bottom/2 + r.top/2) ];
          break;
       case 'R':
          p = [ Math.round(r.right), Math.round(r.bottom/2 + r.top/2) ];
          break;
       case 'T':
          p = [ Math.round(r.right/2 + r.left/2), Math.round(r.top) ];
          break;
       case 'B':
          p = [ Math.round(r.right/2 + r.left/2), Math.round(r.bottom) ];
          break;
   }

   //DEBUG console.log("\nport=",p);
   return p;
}

/* firgures our which ports to use to connect
   e1 and e2. There are four ports for each 
   element: T(op), B(ottom), R(ight), L(eft) */
function whichPort(e1,e2) {
   /* for now presume r,l */
   
   var e1r = getOffsetRect(e1);
   var e2r = getOffsetRect(e2);
   var e1x = e1r.left + e1r.width/2;
   var e1y = e1r.top + e1r.height/2;
   var e2x = e2r.left + e2r.width/2;
   var e2y = e2r.top + e2r.height/2;
   
   //DEBUG console.log(`e1=(${e1x},${e1y}) e2=(${e2x},${e2y})`)
   //console.log('e1=',e1r,e1,'e2=',e2r,e2)

   //Because map is from left to right
   //default is [R,L]
   if ( e2x - e1x < 4) return [ "R","R" ];
   else return [ "R", "L" ]
}

function error(msg) {
   return '<span style="color:green">vecmap:</span><span style="color:red">'+msg+'</span>';
}

/* Produces an svg path element to connect e1 and e2 */
function connect(tgrdiv,e1, e2) {
   var dir = whichPort(e1,e2);
   //DEBUG console.log(`dir=${dir}`)
   var p1 = getPort(tgrdiv,dir[0],e1);
   var p2 = getPort(tgrdiv,dir[1],e2);
   var offy,offx,qoff=10;

   if ( e1 == null || e2 == null ) return error("can't connect null element");
   if ( p1 == null ) return error('port not found for '+e1.tagName+' - '+e1.innerHTML);
   if ( p2 == null ) return error('port not found for '+e2.tagName+' - '+e2.innerHTML);
   var vdist = Math.abs(p2[1] - p1[1]);
   if ( p2[1] > p1[1] ) offy = vdist/2; //+10;  // Curve down
   if ( p2[1] < p1[1] ) offy = -vdist/2; //-10;  // Curve up
   if ( vdist < 5 ) offy = 0;  //Straight line if vertical distance is less than 5px
   
   var hdist = Math.abs(p2[0] - p1[0]);
   if ( dir[1] == "L" ) offx = -10; // 10px left of edge
   if ( dir[1] == "R" ) { offx = +10; qoff = 20 } // 10px right of edge
   //if ( hdist < 5) qoff = 18 //Larger loop if horizontal distance is less than 5px (ont )
   return '<path d="M'+p1[0]+','+p1[1]       +' Q'+(p1[0]+qoff)+','+p1[1]+
          '  '+(p1[0]+qoff) +','+(p1[1]+offy)+' Q'+(p1[0]+qoff)+','+p2[1]+
          '  '+(p2[0]+offx) +','+p2[1]+'" marker-end="url(#vm-arrow)"/>'
/*#aeb0b5 */
}

exports.buildSVG = function (tgrdiv, tidtree) {
   var div = document.getElementById(tidtree.id+'-table');
   if (!div) {
      //FIXME: this is done because the window.onresize function
      // is not cleaned up in widget.render when a tiddler is not
      // visibe any more or is deleted 
      return;
   }
   var table_rect =  div.getBoundingClientRect();
return '<svg  xmlns="http://www.w3.org/2000/svg" height="'+table_rect.height+'px" width="'+table_rect.width+
       'px" style="overflow: visible"> <defs> <marker id="vm-arrow" viewBox="0 0 10 10" refX="1" refY="5" '+
       'markerUnits="strokeWidth" orient="auto" '+
       'markerWidth="8" markerHeight="6"> '+
       '<polyline class="ihm-tgr-arrow tgr-arrow" points="0,0 10,5 0,10 0,5" style="opacity:1;"/>'+
       '</marker>'+
       '<marker id="vm-circle" viewBox="-25 0 50 50" refX="0" refY="0" '+ 
       'markerUnits="strokeWidth" orient="0" '+
       'markerWidth="50" markerHeight="50"> '+
       '<text x = "-10" y = "12.5" fill = "navy" font-size = "15"> '+
       ' It was the best of times '+
       '</text> '+
       '<rect x="-15" y="0" width="30" height="15" rx="0px" ry="0px" style="opacity:0.5" /> '+
       '<circle cx="1" cy="5" r="1" stroke="darkblue" stroke-width="1" fill="red" /> '+
       '</marker> '+
       '</defs> '+
       '<g class="ihm-tgr-link tgr-link"  height="'+table_rect.height+'px" '+
       'width="'+table_rect.width+'px" style="overflow: visible"> '+
       connectAll(tgrdiv,tidtree) +
       '</g> </svg>';
}

/* Return an array of the children of tiddler tid */
function getChildren(tid,tidtree) {
   var filter,res;
   switch ( tidtree.mode.toLowerCase() ) {
      case 'tagging':
         filter = '[['+tid+']tagging[]]+'+tidtree.filter;
         res = $tw.wiki.filterTiddlers(filter);
         break;
      case 'linking':
         filter = '[['+tid+']links[]!is[missing]]+'+tidtree.filter;
         res = $tw.wiki.filterTiddlers(filter);
         break;
   }
   return res;
}

/* Return true if the child tiddler is a descendant parent */
exports.isDescendant = function (child,parent,tidtree) {
   if ( isChild(child,parent, tidtree) ) return true;
   
   //Traverse the tree to find out if it is a child
   var children = getChildren(parent,tidtree);
   var len = children.length;
   var res = false;
   for( var i = 0; i<len; i++ ) {
      res = exports.isDescendant(child,children[i],tidtree);
      if (res) {
         //DEBUG console.log(`${child} is descendant of ${children[i]}`);
         break;
      }
   } 
   return res;
}

/* Return true if the child tiddler is a child of parent */
function isChild(child,parent,tidtree) {
   switch ( tidtree.mode.toLowerCase() ) {
      case 'tagging':
         var c = $tw.wiki.getTiddler(child);
         if (c) return c.hasTag(parent);
         else return false;
         break;
      default:
         var c = getChildren(parent, tidtree);
         return ( c.indexOf(child) !== -1 )
   }
}

function connectAll(tgrdiv,tidtree) {
   var res = [],el1,el2,title1,title2,esctitle1,esctitle2;

   function addPath(c,p) {
      title1 = p;
      title2 = c;
      esctitle1 = escape(title1);
      esctitle2 = escape(title2);
      el1 = document.getElementById(tidtree.id+'-'+esctitle1);
      el2 = document.getElementById(tidtree.id+'-'+esctitle2);
      if ( el1 && el2 ) res.push( connect(tgrdiv, el1, el2) )//DEBUG,console.log(`${p} -----> ${c}`,el1,el2);
   }
   //Collect SVG paths for all nodes in the main tree
   dfvisit(tidtree.root,function(child,acc,currdepth) {
      //We skip root
      var parent=child.parent;
      if (parent) addPath(child.id,parent.id)
   },{},{"skipvisited":false})

   //Now collect SVG paths for outliers
   var len = tidtree.outliers.length;
   for(var i=0; i<len; i++) {
      var c=tidtree.outliers[i][0];
      var p=tidtree.outliers[i][1];
      addPath(c,p,true);
   }

   return res.join(" ");
}

/*********************************************************************
 *                     Tree traversal functions                      *
 *********************************************************************/

/* Depth first tree traversal 
 * Parameters: 
 * n: Start node
 * cb: callback function (node,acc,level)
 *     level: starts at 0 which is root
 *     node: the node being visited
 *     acc: an acumulator that gets passed from call to call
 *          it is an object passed by reference
 * accInit: Initial acc for cb
 * options: Object with the optional keys:
 *    getCh: function to get Children of node (n) (default returns n.children)
 *    skipvisited: true to skip nodes already visited (default true)
*/
function dfvisit(n,cb,accInit,opts) {
   var opts = opts || {}
   var done=opts.done || []
   var getCh = opts.getCh || function (o) { return o.children }
   var lvl=opts.lvl || 0
   var skipvisited = opts.skipvisited===undefined ? true:opts.skipvisited
   opts.leave = opts.leave ||  false

   // return if node already visited
   if ( skipvisited && (done.indexOf(n)!==-1) )
   return accInit

   //mark node as visited
   done.push(n)

   //get children
   var ch=getCh(n), len=ch.length, acc=accInit || {}
   
   // process node
   opts.lvl=lvl+1
   opts.done = done

   if ( cb(n,acc, lvl) === false )  {
      opts.leave = true
      return acc
   }

   //recurse through children
   for( var i = 0; i < len; i++ ){
      acc=dfvisit(ch[i], cb, acc, opts)
      if (  opts.leave  )
         return acc
   }
   opts.lvl--
   return acc
}

/* Breadth first tree traversal 
 * Parameters: 
 * n: Start node
 * cb: callback function (node,acc,startsLevel)
 * accInit: Initial accumulator for callback function
 * getCh: gets Children of node (one parameter: node)
*/
function bfvisit(n,cb,accInit,opts) {
  function visited(n,done,skipvisited) {
    if (!skipvisited) return false
      if (done.indexOf(n)===-1) return false
      else return true
  }

  var opts = opts || {}
  var getCh = opts.getCh || function (o) { return o.children }
  var getId = opts.getId || function (o) { return o.id }
  var skipvisited = opts.skipvisited===undefined ? true:opts.skipvisited
  var maxdepth = opts.maxdepth || -1
  var accInit = accInit || {}
  var acc = accInit
  var queue = [], done = []
  var parent = [];
  var depth = 0;

  // enqueue root
  queue.push( n )
  parent[getId(n)] = undefined
  
  do {
    var len = queue.length

    // for each node in the queue
    for( var i = 0; i < len; i++ ) {
      // dequeue
      var n1 = queue.shift();

      // process node
      if (!visited(n1,done,skipvisited))
         if ( cb(n1,parent[getId(n1)],acc) === false) 
            return acc

      done.push(n1)

      // enqueue children of the node
      var children = getCh(n1)
      queue = queue.concat(children)
      if (children) children.forEach(function (c) { 
         var p = parent[getId(c)]; 
         if (!p) {
            parent[getId(c)] = n1;
         } else {
            //See if it is an outlier
            if ( (getId(p)!==getId(n1)) && opts.outlier) { 
               opts.outlier(c,n1)
            }
         }
      })
    }

    // level finished
    depth++

    // repeat
  } while( ( 0 !== queue.length ) && (depth<=maxdepth) )
  return acc
}

/*********************************************************************
 *                     Tidtree utility functions                     *
 *********************************************************************/
/* Build a tidtree from the starting tiddler 
 * Parameters:
 *    tid: the starting tiddler
 */
function makeTidTree(tid,tidtree,opts) {
  var opts = opts || {}
  tidtree.outliers = [];

  //Get id of Tiddler
  function getId(n) {
     return n;
     //FIXME: return n.id
  }

  //Get Children of Tiddler
  function getCh(n) {
     return getChildren(n,tidtree)
     //FIXME: return n.children
  }

  //Lookup id in array of tidtree nodes
  function inArray(a,id) {
	 var len=a.length;
	 for (var i=0;i<len;i++) {
		if ( a[i].id === id ) return a[i];
	 }
	 return undefined;
  }

  //Build the tidtree
  var root=new tnode(undefined,getId(tid),false);
  bfvisit(tid,function(n,p,acc) {
	 var node,added;
    //console.log("visited=",n.id," parent=",p ? p.id:"undef")
	 //console.log(`looking for parent of ${n.id} which supposedly is ${p ? p.id:"undef"}`);
	 if (p) {
      var n_id = getId(n), p_id = getId(p);
		node = inArray(acc.visited,p_id);
		added = node.addChild(n_id,false);
		acc.visited.push(added)
	 }
	 return true
  }, 
  {visited:[root]},{"getId":getId, "getCh":getCh, maxdepth: tidtree.maxdepth, skipvisited: true,
                      outlier: function (child,parent) {
                         tidtree.outliers.push([child,parent])
                      }
})

return root;
}

/* Count descendants for the specified tnode
 * Parameters:
 *   node: Children of this node will be included in the count
*/
function countDescendants(node,skipvisited) {
  var acc = dfvisit(node,function(n,acc1) {
    acc1.cnt++;
    return true
  },{cnt: 0},{"skipvisited":skipvisited})
  return acc.cnt-1
}
/*********************************************************************
 *                    Tree node class functions                      *
 *********************************************************************/

/* Tree node functions
 * - Constructor
 * - addChild
 * - toString
*/
//Tree node constructor
function tnode(parent,id,collapse) {
  if ( !(this instanceof tnode) )
          throw "Error: call new tnode(id="+id+")";
  this.parent = parent
  this.id = id
  this.children = []
}

//Return child that was added
tnode.prototype.addChild = function(id,collapse) {
  var ch =new tnode(this,id,collapse)
  this.children.push(ch)
  return ch;
}

tnode.prototype.toString = function() {
  return "tnode(id="+this.id+")"
};


function printtree(n,skipvisited,getStr) {
  var spaces = "├";
  var getStr = getStr || function(e) { return e.toString() }
  var str = "";
  var a = dfvisit(n,function(n,acc,lvl) {
	 spaces = new Array( lvl + 1 ).join( "-" )
	 str += spaces+getStr(n)+"\n"
	 return true
  },{"skipvisited":skipvisited})
  console.log(str)
}

/*********************************************************************
 *                           Testing code                            *
 *********************************************************************/
/*FIXME:
var o11 = {id: 'o11', collapse: false, children: [ ] }
var o12 = {id: 'o12', collapse: false, children: [ ] }
var o13 = {id: 'o13', collapse: false, children: [ ] }
var o211 = {id: 'o211', collapse: false, children: [ ] }
var o212 = {id: 'o212', collapse: false, children: [ ] }
var o21 = {id: 'o21', collapse: false, children: [ o211, o212 ] }
var o22 = {id: 'o22', collapse: false, children: [ ] }
var o3 = {id: 'o3', collapse: false, children: [ ] }
var o1 = {id: 'o1', collapse: false, children: [ o11, o12, o13 ] }
var o2 = {id: 'o2', collapse: false, children: [ o21,o22 ] }
var o = {id: 'o', collapse: false, children: [ o12,o1, o2, o3 ] }

var tidt = makeTidTree(o,{maxdepth:3})
printtree(o,true,function(n) { return n.id })
console.log('children of o:',countDescendants(o))
console.log('children of o not skipping repeats:',countDescendants(o,false))
console.log('children of o1:',countDescendants(o1))
console.log('children of tidt o:',countDescendants(tidt))
console.log('children of tidt o1:',countDescendants(o1)) */
})();

