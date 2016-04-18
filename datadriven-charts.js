window.DataDriven = window.DataDriven || {}

window.DataDriven.qualy = function(all_data) {
  var data = all_data.qdata

  var constructors = all_data.constructors
  var conscolors =   ["#7f7f7f", "#d62728", "#5254a3", "#1f77b4", "#393b79", "#ff7f0e", "#222222", "#ffee11", "#0000aa", "#c7c7c7", "#0000ff", "#00ff00", "#ff0000"]

  var c = d3.conventions({
    parentSel: d3.select("#qualy"), 
    height: 400, 
    width: 700, 
    margin: {top: 10, right: 0, bottom: 20, left: 40},
    x: d3.scale.ordinal().domain(["Q1", "Q2", "Q3"]).rangeBands([0, 700])
  })

  d3.select("#qualy svg")
    .attr('viewBox', "0 0 "+ (c.width + c.margin.left + c.margin.right) + " " + (c.height + c.margin.top + c.margin.bottom) + "")
    .attr("width", null)
    .attr("height", null)
    .style("min-height", "400px")
  
  var driver_count = data.length
  
  c.y.domain([
    d3.min(data, function(d) { return Math.floor(Math.min(d.q1 || 99999, d.q2 || 99999, d.q3 || 99999)) }), 
    d3.max(data, function(d) { return Math.ceil(Math.max(d.q1 || 0, d.q2 || 0, d.q3 || 0)) })
  ])

  c.yAxis.tickFormat(function(d) { return "" + d + "s" })
  c.yAxis.tickSize(-c.width)
  c.xAxis.tickSize(0);
  c.drawAxis()
  
  var color = d3.scale.category10()
    .domain(constructors)
    .range(conscolors)
  
  var qcolor = d3.scale.category10()
    .domain([0, 1, 2])
    .range(["#F2F2F2", "#eaeaea", "#e2e2e2"])
  
  function tf(s) {
    return Math.round(s * 1000) / 1000
  }
  
  function draw_qdata(e) {
    var ret = e.enter()
  
    var valueline = d3.svg.line()
      .interpolate("monotone")       // <=== THERE IT IS!
      .x(function(d) { return d.x })
      .y(function(d) { return d.y })
  
    var group = ret.append("g")
      .attr("class", "q")
      .attr("data-driver", function(d){ return d.driver })
      .attr("data-constructor", function(d){ return d.constructor })
      .attr("data-time", function(d){ return d.time })
  
    group.append("path")
      .attr("d", function(d) {
        var ld = []
        var w = c.width / 3
        d.time.map(function(e, i) {
          ld.push({ x: (i + (i==0 ? 0 : 0.2))*w, y: c.y(e) })
          ld.push({ x: (i + (i==2 ? 1 : 0.8))*w, y: c.y(e) })
        })
        return "" + valueline(ld) 
      })
      .attr("class", "qpath")
      .style("stroke", function(d) { return color(d.constructor) })
      .style("fill", "none")
      .on("mouseover", function(d) {
        d3.select(this).style("stroke-width", 5)
        d3.select("#label-"+i+"-"+d.driver).style("display", "block")
      })
      .on("mouseout", function(d) {
        d3.select(this).style("stroke-width", 1)
        d3.select("#label-"+i+"-"+d.driver).style("display", "none")
      })
  
    var label = group.append("g")
      .attr("transform", function(d, idx) {
        return "translate("+ (d.time.length * c.width / 3) +", " + c.y(d.time[d.time.length-1]) + ")"
      })
      .attr("class", "label")
      .attr("id", function(d) { return "label-"+i+"-"+d.driver })
      .style("display", "none")
  
    // var rect = label.append("rect")
    //   .attr("width", c.width/3 * 0.6)
    //   .attr("height", function(d) { return 10 + 25 * (1 /*+ d.time.length*/) } )
    //   .attr("x", 0)
    //   .attr("y", 10)
    //   .style("fill", "#fff")
    //   .style("opacity", 0.9)
  
    label.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .text(function(d) { return "" + d.driver + " (" + d.position + ")" })
      .attr('text-anchor', 'end')
      .style('font-weight', 'bold')

    // label.append("text").attr("x", 5).attr("y", 30 + 25).text(function(d) { return d.time[0] == null ? "" : "Q1: " + tf(d.time[0]) + "s" })
    // label.append("text").attr("x", 5).attr("y", 30 + 50).text(function(d) { return d.time[1] == null ? "" : "Q2: " + tf(d.time[1]) + "s" })
    // label.append("text").attr("x", 5).attr("y", 30 + 75).text(function(d) { return d.time[2] == null ? "" : "Q3: " + tf(d.time[2]) + "s" })
  
    return ret
  }

  for (var i = 0; i < 3; i++) {
    c.svg.append("rect")
      .attr("transform", function(d, idx) {
        return "translate(" + (i * c.width / 3) + ", 0)"
      })
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", c.width / 3)
      .attr("height", c.height)
      .style("fill", function(d) { return qcolor(i) })
      .style("stroke", "none")
      .style("stroke-width", 0)
  }
  
  c.drawAxis()

  var qualy = c.svg.selectAll(".q").data(data)
  draw_qdata(qualy)
}

window.DataDriven.laps = function(all_data) {

  const SCALES = {}

  var zoomed = false
  var config

  function configureScales(data) {
      SCALES.x = d3.scale.linear()
          .domain([0, data.lap_count])
          .range([config.margin.left, config.width - config.margin.right]);
      SCALES.y = d3.scale.linear()
          .domain([0, data.laps.length - 1])
          .range([config.margin.top, config.height - config.margin.bottom - config.margin.top]);
      SCALES.clr = d3.scale.category20();
  }

  function processLapMarkers(data, key) {
    var markers = [];
    var p = 0;
    for (var i = 0; i < data.laps.length; i++) {
      var lapData = data.laps[i];
      var laps = lapData[key];
      if (laps != undefined) {
        for (var j = 0; j < laps.length; j++) {
          var lap = laps[j];
          var marker = {};
          marker.start = lapData.placing[0];
          marker.lap = lap;
          marker.placing = lapData.placing[lap];
          marker.name = lapData.driver.driverId;
          markers[p++] = marker;
        }
      }
    }
    return markers;
  }

  function addLapTickLines(vis, lapCount) {
    vis.selectAll('line.tickLine')
      .data(SCALES.x.ticks(lapCount))
      .enter().append('svg:line')
      .attr('class', 'tickLine zoom')
      .attr('x1', function(d) {
        return SCALES.x(d + 0.5);
      })
      .attr('x2', function(d) {
        return SCALES.x(d + 0.5);
      })
      .attr('y1', SCALES.y.range()[0] - config.tick_mark_length)
      .attr('y2', SCALES.y.range()[1] + config.tick_mark_length)
      .attr('visibility', function(d) {
        return d <= lapCount ? 'visible' : 'hidden'
      });
  }

  function addLappedElement(vis, data) {
    if (data != undefined) {
      var width = SCALES.x(1) - SCALES.x(0);
      vis.selectAll('rect.lapped')
        .data(data)
        .enter()
        .append('svg:rect')
        .attr('class', 'lapped zoom')
        .attr('x', function(d, i) {
            return SCALES.x(i + 0.5);
        })
        .attr('y', function(d) {
            return SCALES.y(d > 0 ? d - 1.5 : 0);
        })
        .attr('height', function(d) {
            return d > 0 ? SCALES.y.range()[1] - SCALES.y(d - 1.5) : 0;
        })
        .attr('width', function(d) {
            return d > 0 ? width : 0;
        });
    }
  }

  function addSafetyElement(vis, data) {
    if (data != undefined) {
      var y = SCALES.y.range()[0];
      var height = SCALES.y.range()[1] - y;
      var width = SCALES.x(1) - SCALES.x(0);
      vis.selectAll('rect.safety')
        .data(data)
        .enter()
        .append('svg:rect')
        .attr('class', 'safety zoom')
        .attr('x', function(d) {
            return SCALES.x(d - 0.5);
        })
        .attr('y', function() {
            return y;
        })
        .attr('height', function() {
            return height;
        })
        .attr('width', function() {
            return width;
        });
    }
  }

  function addLapLabels(vis, data, y, dy, cssClass) {
    vis.selectAll('text.lap.' + cssClass)
      .data(SCALES.x.ticks(data))
      .enter().append('svg:text')
      .attr('class', 'lap ' + cssClass + ' zoom')
      .attr('x', function(d) {
        return SCALES.x(d)
      })
      .attr('y', y)
      .attr('dy', dy)
      .attr('text-anchor', 'middle')
      .text(function(d, i) {
        return i > 0 ? i : ''
      })
  }

  function addPlacingsLines(vis, valueLine, laps) {
    vis.selectAll('polyline.placing')
      .data(laps)
      .enter()
      .append('svg:path')
      .attr('class', 'placing zoom')
      .attr('d', function(d) {
        var points = []
        for (var i = 0; i < d.placing.length; i++) {
            points[i] = {x: SCALES.x(i), y: SCALES.y(d.placing[i] - 1)}
        }
        if (points.length > 0) {
            points.push({x: SCALES.x(i - 0.5), y: SCALES.y(d.placing[i - 1] - 1)})
        }
        return "" + valueLine(points) 
      })
      .style('stroke', function(d) {
        return SCALES.clr(d.placing[0]);
      })
      .on('mouseover', function(d) {
        highlight(vis, d.driver.driverId);
      })
      .on('mouseout', function() {
        unhighlight(vis);
      })
  }

  function addDriverLabels(vis, laps, cssClass, x, textAnchor) {
    return vis.selectAll('text.label.' + cssClass)
      .data(laps)
      .enter()
      .append('svg:text')
      .attr('class', 'label ' + cssClass)
      .attr('x', x)
      .attr('dy', '0.35em')
      .attr('text-anchor', textAnchor)
      .text(function(d) {
          return d.driver.code;
      })
      .style('fill', function(d) {
        return SCALES.clr(d.placing[0]);
      })
      .on('mouseover', function(d) {
        highlight(vis, d.driver.driverId);
      })
      .on('mouseout', function() {
        unhighlight(vis);
      });
  }

  function addMarkers(vis, data, cssClass, label, form) {
    label = label || "P"

    // Place circle glyph.
    var sym = vis.selectAll("circle.marker." + cssClass)
      .data(data)
      .enter()
    if (form === "circle") {
      sym = sym.append("svg:circle")
      .attr("class", "marker " + cssClass + " zoom")
      .attr("cx", function(d) {
          return SCALES.x(d.lap)
      })
      .attr("cy", function(d) {
          return SCALES.y(d.placing - 1)
      })
      .attr("r", config.marker_radius)
      .style("stroke", function(d) {
          return SCALES.clr(d.start)
      })
    } else if (form === "triangle") {
      sym = sym.append("svg:path")
      .attr("class", "marker " + cssClass + " zoom")

      .attr("d", function(d) {
          return [
            "M", SCALES.x(d.lap - 0.5), ",", SCALES.y(d.placing - 1), 
            "L" + SCALES.x(d.lap + 0.5), ",", SCALES.y(d.placing - 1.3), 
            "L" + SCALES.x(d.lap + 0.5), ",", SCALES.y(d.placing - 0.7), 
            "L", SCALES.x(d.lap - 0.5), ",", SCALES.y(d.placing - 1)
          ].join('')
      })
      .style("stroke", function(d) {
          return SCALES.clr(d.start);
      })
    }
    sym.on('mouseover', function(d) {
        highlight(vis, d.name);
      })
      .on('mouseout', function() {
        unhighlight(vis);
      });

    // Place text
    vis.selectAll("text.label.marker." + cssClass)
      .data(data)
      .enter()
      .append("svg:text")
      .attr("class", "label marker " + cssClass + " zoom")
      .attr("x", function(d) {
          return SCALES.x(d.lap + (form === 'triangle' ? 0.2 : 0));
      })
      .attr("y", function(d) {
          return SCALES.y(d.placing - 1);
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(label)
  }

  function unhighlight(vis) {
      // Reset opacity.
      vis.selectAll('path')
          .style('opacity', config.highlight_opacity);
      vis.selectAll('circle')
          .style('opacity', config.highlight_opacity);
      vis.selectAll('text.label')
          .style('opacity', config.highlight_opacity);
  }

  function highlight(vis, name) {
    // Dim others.
    vis.selectAll('path.placing')
      .style('opacity', function(d) {
        return d.driver.driverId == name ? config.highlight_opacity : config.dimmed_opacity;
      });

    vis.selectAll('circle.marker, path.marker')
      .style('opacity', function(d) {
        return d.name == name ? config.highlight_opacity : config.dimmed_opacity;
      });

    vis.selectAll('text.label.marker')
      .style('opacity', function(d) {
        return d.name == name ? config.highlight_opacity : config.dimmed_opacity;
      });
  }

  var data = all_data.chart_data

  config = d3.conventions({
    parentSel: d3.select("#lapchart"),
    height: 400,
    width: 700,
    margin: {top: 20, right: 40, bottom: 20, left: 40},
    tick_mark_length: 8,
    marker_radius: 5,
    transitionduration: 1000,
    dimmed_opacity: 0.2,
    highlight_opacity: 1.0,
    zoom_peak: 6.0,
    zoom_shoulder: 3.0,
  })
  configureScales(data)

  data.pitstops = processLapMarkers(data, "pitstops");
  data.mechanical = processLapMarkers(data, "mechanical");
  data.accident = processLapMarkers(data, "accident");
  data.disqualified = processLapMarkers(data, "disqualified");

  var vis = d3.select('#lapchart svg')
    .attr("class", "lap-svg")
    .attr('viewBox', "0 0 "+ (config.width) + " " + (config.height) + "")
    .attr("width", null)
    .attr("height", null)
    .style("min-height", "400px")

  // Background rect to catch zoom clicks.
  vis.append('svg:rect')
    .attr('class', 'zoom')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', config.width)
    .attr('height', config.height)
    .style('opacity', 0.0)

  // grey background 
  vis.append('svg:rect')
    .attr('class', 'background')
    .attr('x', SCALES.x(-0.2))
    .attr('y', config.margin.top - 10)
    // .attr('x', 0)
    // .attr('y', 0)

    .attr('width', SCALES.x(data.lap_count+1) - SCALES.x(0))
    .attr('height', config.height - config.margin.top - config.margin.bottom)
    .style('opacity', 1.0)
    .style('fill', "#F2F2F2")
    .style('pointer-events', 'none')

  // these are ususally empty since there is no data in ergast
  addSafetyElement(vis, data.safety)
  addLappedElement(vis, data.lapped)

  // vertical lap lines
  addLapTickLines(vis, data.lap_count)

  // Lap labels
  addLapLabels(vis, data.lap_count, SCALES.y.range()[0] - config.margin.top, '1em', 'top')
  addLapLabels(vis, data.lap_count, SCALES.y.range()[1] + config.margin.bottom, '-0.3em', 'bottom')

  var valueLine = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return d.x })
    .y(function(d) { return d.y })

  // draw the lap lines
  addPlacingsLines(vis, valueLine, data.laps)

  // driver labels on start
  addDriverLabels(vis, data.laps, 'pole', SCALES.x(0) - 7, 'end')
    .attr('y', function (d) {
      return SCALES.y(d.placing[0] - 1);
    });
  // driver labesl at finish
  addDriverLabels(vis, data.laps, 'flag', SCALES.x(data.lap_count) + 14, 'start')
    .attr('y', function (d, i) {
      return SCALES.y(i);
    });

  // Add markers.
  addMarkers(vis, data.pitstops, "pitstop", "P", "circle");
  addMarkers(vis, data.mechanical, "mechanical", "M", "triangle");
  addMarkers(vis, data.accident, "accident", "A", "triangle");
  addMarkers(vis, data.disqualified, "disqualified", "D", "triangle");
}
