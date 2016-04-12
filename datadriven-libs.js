// d3 jetpack
(function() {
      
  function jetpack(d3) {
      d3.selection.prototype.translate = function(xy) {
          return this.attr('transform', function(d,i) {
              return 'translate('+[typeof xy == 'function' ? xy(d,i) : xy]+')';
          });
      };

      d3.transition.prototype.translate = function(xy) {
          return this.attr('transform', function(d,i) {
              return 'translate('+[typeof xy == 'function' ? xy(d,i) : xy]+')';
          });
      };

      d3.selection.prototype.tspans = function(lines, lh) {
          return this.selectAll('tspan')
              .data(lines)
              .enter()
              .append('tspan')
              .text(function(d) { return d; })
              .attr('x', 0)
              .attr('dy', function(d,i) { return i ? lh || 15 : 0; });
      };

      d3.selection.prototype.append = 
      d3.selection.enter.prototype.append = function(name) {
          var n = d3_parse_attributes(name), s;
          //console.log(name, n);
          name = n.attr ? n.tag : name;
          name = d3_selection_creator(name);
          s = this.select(function() {
              return this.appendChild(name.apply(this, arguments));
          });
          return n.attr ? s.attr(n.attr) : s;
      };

      d3.selection.prototype.insert = 
      d3.selection.enter.prototype.insert = function(name, before) {
          var n = d3_parse_attributes(name), s;
          name = n.attr ? n.tag : name;
          name = d3_selection_creator(name);
          before = d3_selection_selector(before);
          s = this.select(function() {
              return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
          });
          return n.attr ? s.attr(n.attr) : s;
      };

      var d3_parse_attributes_regex = /([\.#])/g;

      function d3_parse_attributes(name) {
          if (typeof name === "string") {
              var attr = {},
                  parts = name.split(d3_parse_attributes_regex), p;
                  name = parts.shift();
              while ((p = parts.shift())) {
                  if (p == '.') attr['class'] = attr['class'] ? attr['class'] + ' ' + parts.shift() : parts.shift();
                  else if (p == '#') attr.id = parts.shift();
              }
              return attr.id || attr['class'] ? { tag: name, attr: attr } : name;
          }
          return name;
      }

      function d3_selection_creator(name) {
          return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? function() {
              return this.ownerDocument.createElementNS(name.space, name.local);
          } : function() {
              return this.ownerDocument.createElementNS(this.namespaceURI, name);
          };
      }

      function d3_selection_selector(selector) {
          return typeof selector === "function" ? selector : function() {
              return this.querySelector(selector);
          };
      }

      d3.wordwrap = function(line, maxCharactersPerLine) {
          var w = line.split(' '),
              lines = [],
              words = [],
              maxChars = maxCharactersPerLine || 40,
              l = 0;
          w.forEach(function(d) {
              if (l+d.length > maxChars) {
                  lines.push(words.join(' '));
                  words.length = 0;
                  l = 0;
              }
              l += d.length;
              words.push(d);
          });
          if (words.length) {
              lines.push(words.join(' '));
          }
          return lines;
      };
      
      d3.ascendingKey = function(key) {
          return typeof key == 'function' ? function (a, b) {
                return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : key(a) >= key(b) ? 0 : NaN;
          } : function (a, b) {
                return a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : a[key] >= b[key] ? 0 : NaN;
          };
      };

      d3.descendingKey = function(key) {
          return typeof key == 'function' ? function (a, b) {
              return key(b) < key(a) ? -1 : key(b) > key(a) ? 1 : key(b) >= key(a) ? 0 : NaN;
          } : function (a, b) {
              return b[key] < a[key] ? -1 : b[key] > a[key] ? 1 : b[key] >= a[key] ? 0 : NaN;
          };
      };
      
      d3.f = function(){
          var functions = arguments;
          //convert all string arguments into field accessors
          var i = 0, l = functions.length;
          while (i < l) {
              if (typeof(functions[i]) === 'string' || typeof(functions[i]) === 'number'){
                  functions[i] = (function(str){ return function(d){ return d[str] }; })(functions[i])
              }
              i++;
          }
           //return composition of functions
          return function(d) {
              var i=0, l = functions.length;
              while (i++ < l) d = functions[i-1].call(this, d);
              return d;
          };
      };
      // store d3.f as convenient unicode character function (alt-f on macs)
      if (!window.hasOwnProperty('ƒ')) window.ƒ = d3.f;
  }

  if (typeof d3 === 'object' && d3.version) jetpack(d3);
  else if (typeof define === 'function' && define.amd) {
      define(['d3'], jetpack);
  }
})();



// d3 conventions
d3.conventions = function(c){
  c = c || {}

  c.width  = c.width  || 900
  c.height = c.height || 500

  c.margin = c.margin || {top: 20, right: 20, bottom: 20, left: 25}

  c.parentSel = c.parentSel || d3.select('body')

  c.rootSVG = c.rootSVG || c.parentSel.append("svg")
      .attr("width", c.width + c.margin.left + c.margin.right)
      .attr("height", c.height + c.margin.top + c.margin.bottom)
      
  c.svg = c.svg || c.rootSVG
    .append("g")
      .attr("transform", "translate(" + c.margin.left + "," + c.margin.top + ")")

  c.color   = c.color   || d3.scale.category10()
  c.x       = c.x       || d3.scale.linear().range([0, c.width])
  c.y       = c.y       || d3.scale.linear().range([c.height, 0])
  c.rScale  = c.rScale  || d3.scale.sqrt().range([5, 20])
  c.line    = c.line    || d3.svg.line()


  c.xAxis = c.xAxis || d3.svg.axis().scale(c.x).orient("bottom");
  c.yAxis = c.yAxis || d3.svg.axis().scale(c.y).orient("left")


  c.drawAxis = function(){
    c.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + c.height + ")")
        .call(c.xAxis);

    c.svg.append("g")
        .attr("class", "y axis")
        .call(c.yAxis);
  }
  
  return c
}

d3.attachTooltip = function(sel, fieldFns){
  sel 
      .on('mouseover.attachTooltip', ttDisplay)
      .on('mousemove.attachTooltip', ttMove)
      .on('mouseout.attachTooltip',  ttHide)


  var d = sel.datum()
  fieldFns = fieldFns || d3.keys(d)
      .filter(function(str){
        return (typeof d[str] != 'object') && (d[str] != 'array')
      })
      .map(function(str){
        return function(d){ return str + ': <b>' + d[str] + '</b>'} })

  function ttDisplay(d){
    d3.select('.tooltip')
        .classed('tooltip-hidden', false)
        .html('')
      .dataAppend(fieldFns, 'div')
        .html(function(fn){ return fn(d) })

    d3.select(this).classed('tooltipped', true)
  }

  function ttMove(d){
    var tt = d3.select('.tooltip')
    if (!tt.size()) return
    var e = d3.event,
      x = e.clientX,
      y = e.clientY,
      doctop = (window.scrollY)? window.scrollY : (document.documentElement && document.documentElement.scrollTop)? document.documentElement.scrollTop : document.body.scrollTop;
      n = tt.node(),
      nBB = n.getBoundingClientRect()

    tt.style('top', (y+doctop-nBB.height-18)+"px");
    tt.style('left', Math.min(Math.max(0, (x-nBB.width/2)), window.innerWidth - nBB.width)+"px");
  }

  function ttHide(d){
    d3.select('.tooltip').classed('tooltip-hidden', true);

    d3.selectAll('.tooltipped').classed('tooltipped', false)
  }
}


d3.selection.prototype.dataAppend = function(data, name){
  return this.selectAll(name)
      .data(data).enter()
    .append(name)
}



// array.map polyfill


if (!Array.prototype.map) {

  Array.prototype.map = function (callback, thisArg) {

    var T, A, k;

    if (this == null) {
      throw new TypeError(' this is null or not defined');
    }

    // 1. Let O be the result of calling ToObject passing the |this|
    //    value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal
    //    method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (arguments.length > 1) {
      T = thisArg;
    }

    // 6. Let A be a new array created as if by the expression new Array(len)
    //    where Array is the standard built-in constructor with that name and
    //    len is the value of len.
    A = new Array(len);

    // 7. Let k be 0
    k = 0;

    // 8. Repeat, while k < len
    while (k < len) {

      var kValue, mappedValue;

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal
      //    method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal
        //    method of O with argument Pk.
        kValue = O[k];

        // ii. Let mappedValue be the result of calling the Call internal
        //     method of callback with T as the this value and argument
        //     list containing kValue, k, and O.
        mappedValue = callback.call(T, kValue, k, O);

        // iii. Call the DefineOwnProperty internal method of A with arguments
        // Pk, Property Descriptor
        // { Value: mappedValue,
        //   Writable: true,
        //   Enumerable: true,
        //   Configurable: true },
        // and false.

        // In browsers that support Object.defineProperty, use the following:
        // Object.defineProperty(A, k, {
        //   value: mappedValue,
        //   writable: true,
        //   enumerable: true,
        //   configurable: true
        // });

        // For best browser support, use the following:
        A[k] = mappedValue;
      }
      // d. Increase k by 1.
      k++;
    }

    // 9. return A
    return A;
  };
}

