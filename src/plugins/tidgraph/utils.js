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

/*********************************************************************
 *                     Tree traversal functions                      *
 *********************************************************************/

/* Depth first tree traversal 
 * Parameters: 
 * n: Start node
 * cb: callback function (node,acc,startsLevel)
 * accInit: Initial acc for cb
 * getCh: gets Children of node (n)
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
  var getCh = opts.getCh || function (o) { return o.children1 }
  var getId = opts.getId || function (o) { return o.id1 }
  var skipvisited = opts.skipvisited || true
  var maxdepth = opts.maxdepth || -1
  var accInit = accInit || {}
  var acc = accInit
  var queue = [], done = []
  var parent = [];
  var depth = 0;

  // enqueue root
  queue.push( n )
  parent[n] = undefined
  
  do {
    var len = queue.length

    // for each node in the queue
    for( var i = 0; i < len; i++ ){
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
      children.forEach(function (c) { var p = parent[getId(c)]; parent[getId(c)] = p ? p:n1  })
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
function makeTidTree(tid,tidtree) {
  //Get id of Tiddler
  function getId(n) {
     return n.id
  }

  //Get Children of Tiddler
  function getCh(n) {
     return n.children
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
	 //console.log(`looking for parent of ${n.id} which supposedly is ${p ? p.id:"undef"}`);
	 if (p) {
      var n_id = getId(n), p_id = getId(p);
		node = inArray(acc.visited,p_id);
		added = node.addChild(n_id,false);
		acc.visited.push(added)
	 }
	 return true
  }, 
  {visited:[root]},{"getId":getId, "getCh":getCh, maxdepth: tidtree.maxdepth})

  printtree(root)
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


function printtree(n,getStr,skipvisited) {
  var spaces = "├";
  var getStr = getStr || function(e) { return e.toString() }
  dfvisit(n,function(n,acc,lvl) {
	 spaces = new Array( lvl + 1 ).join( "-" )
	 console.log(spaces+getStr(n))
	 return true
  },{},{"skipvisited":skipvisited})
}

/*********************************************************************
 *                           Testing code                            *
 *********************************************************************/
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
printtree(o,function(n) { return n.id })
console.log('children of o:',countDescendants(o))
console.log('children of o not skipping repeats:',countDescendants(o,false))
console.log('children of o1:',countDescendants(o1))
console.log('children of tidt o:',countDescendants(tidt))
console.log('children of tidt o1:',countDescendants(o1))
})();

