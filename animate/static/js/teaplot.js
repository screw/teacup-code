/*jshint multistr: true */
/**
 * Copyright (c) 2015 Centre for Advanced Internet Architectures,
 * Swinburne University of Technology. All rights reserved.
 *
 * Author: Isaac True (itrue@swin.edu.au)
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
*/

/* Exported symbols */
var space;

(function () {
    "use strict";



    var colourList;

    /**
     * pure.js template directives for mapping variables to HTML tags
     */
    var directives = {
        graphs: {
            'tr': {
                'graph<-': {
                    '.graphName@value': 'graph.graphName',
                    '.@graph': 'graph.id',
                    '.graphID': 'graph.id'
                }
            }
        },
        metrics: {
            'tr': {
                'metric<-': {
                    '.metricTableRowName': 'metric',
                }
            }
        },
        expids: {
            'tr': {
                'exp<-': {
                    '.expIdTableName': 'exp'
                }
            }
        },
        legends: {
            'li.legendRoot': {
                'legend<-': {
                    '.legendFlow': function (data) {
                        return data.item.lname === undefined || data.item.lname === '' ? data.pos : data.item.lname;
                    },
                    '.legendFlow@flow': function (data) {
                        return data.pos;
                    },
                    '.legendColour@style': function (data) {
                        return 'background-color: rgb(' +
                                (Math.floor(data.item.x * 255)) +
                                ',' + (Math.floor(data.item.y * 255)) +
                                ',' + (Math.floor(data.item.z * 255)) + ');';
                        //return 'background-color: ' + data.item + ';';
                    }
                },
            },
        },
        flows: {
            'tr.flowRow': {
                'flow<-': {
                    '.flowRowName': function (data) {
                        return data.pos;
                    },
                    'tr.flowSubRow': {
                        'flow<-flow': {
                            '.flowSubRowTitle': function (data) {
                                return data.item.flow;
                            },
                            '.flowSubRowLength': function (data) {
                                return data.item.duration.toFixed(2);
                            },
                            '.flowSubRowDataPoints': function (data) {
                                return data.item.size;
                            },
                            '.flowSubRowStart': function (data) {
                                return data.item.start.toFixed(2);
                            },
                        }
                    }
                }
            }
        },
        flowMaps: {
            'tr.flowMapRow': {
                'flow<-': {
                    '.flowMapRowMetric': 'flow.metric',
                    '.flowMapRowFlow': 'flow.flow',
                }
            }
        }

    };

    /**
     * Configuration object.
     *
     *
     */
    var config = {
        exp_id: [],
        src_filter: '',
        metrics: [],
        yscale: {
            'spprtt': 1000.0,
            'ackseq' : 0.001,
            'throughput': 0.001,
            'goodput': 0.001,
            'cwnd': 0.001,
        },
        graphs: [],
        flows: {},
        mapping: [],
        graph: {
            x: {
                min: 0.0,
                max: 100.0
            },
            y: {
                min: 0.0,
                max: 100.0
            },
            z: {
                min: 0.0,
                max: 100.0
            }
        },
        animTime: 4000,
        lnames: [],
        stime: 0,
        etime: 0,
    };

    var flows = {
    };

    var flowMappingRowTemplate = '\
	<tr class="flowMapRow">\
		<td><span class="flowMapRowMetric"></span></td>\
		<td><span class="flowMapRowFlow"></span></td>\
		<td><div class="dropup flowMapRowGraph">\
			<button class="btn btn-default dropdown-toggle" type="button"\
				data-toggle="dropdown" aria-haspopup="true"\
				aria-expanded="true">\
				1 <span class="caret"></span>\
			</button>\
			<ul class="dropdown-menu">\
			</ul></div>\
		</td>\
		<td><div class="dropup flowMapRowXAxis">\
			<button class="btn btn-default dropdown-toggle pull-left" type="button"\
				data-toggle="dropdown" aria-haspopup="true"\
				aria-expanded="true"  metric="TIME" flow="" dataset="" >\
			Time <span class="caret"></span>\
			</button>\
			<ul class="dropdown-menu pull-right">\
			</ul></div>\
		</td>\
		<td><div class="dropup flowMapRowZAxis ">\
				<button class="btn btn-default dropdown-toggle" type="button"\
				data-toggle="dropdown" aria-haspopup="true"\
				aria-expanded="true" metric="NOTHING" flow="" dataset="" >\
				Nothing <span class="caret"></span>\
			</button>\
			<ul class="dropdown-menu pull-right">\
			</ul></div>\
		</td>\
	</tr>';

    var expIdTableTemplate = '\
	<tr>							\
		<td class="expIdTableName"></td>			\
		<td class="checkBoxCell"><div class="checkbox teaplotCheckbox"><label><input type="checkbox"></label></div></td>		\
	</tr>';

    var metricTableRowTemplate = '\
<tr>							\
	<td style="vertical-align:middle;"><span class="metricTableRowName"></span></td>			\
	<td style="vertical-align:middle;"><input class="form-control yscale" type="number" pattern="\d*" min="0.0001" max="10" step="0.1" value="1.0"></td>		\
	<td class="checkBoxCell"><div class="checkbox teaplotCheckbox"><label><input type="checkbox"></label></div></td>		\
</tr>';

    var graphTemplate = '\
<tr>\
    <td><span class="graphID"></span></td>\
	<td><div class="input-group"  style="width:100%;">\
			<input type="text" class="form-control graphName"\
				placeholder="Name" aria-describedby="basic-addon1" />\
		</div></td>\
</tr>';

    var legendFlowTemplate = '\
<li class="legendRoot"> \
	<small><strong><span class="legendColour">&nbsp&nbsp&nbsp</span>&nbsp<a class="legendFlow" href="#"></a></strong></small> \
</li>';

    var flowRowTemplate = '\
<tr class="flowRow">							\
	<td><span class="flowRowName"></span></td>			\
	<td>\
		<table class="table wrappedTable">\
                        <colgroup>\
                          <col style="width:60%">\
                          <col style="width:10%">\
                          <col style="width:10%">\
                          <col style="width:10%">\
                          <col style="width:10%">\
                        </colgroup>  \
			<thead>\
				<tr>\
					<th>Name</th>\
					<th>Start time</th>\
					<th>Length (s)</th>\
					<th>Data points</th>\
					<th>Show</th>\
				</tr>\
			</thead>\
			<tbody>\
				<tr class="flowSubRow">\
			    	<td><span class="flowSubRowTitle"></span></td>\
					<td><span class="flowSubRowStart"></span></td>\
					<td><span class="flowSubRowLength"></span></td>\
					<td><span class="flowSubRowDataPoints"></span></td>\
					<td class="checkBoxCell><div class="checkbox teaplotCheckbox"><label><input type="checkbox"></label></div></td>		\
				</tr>\
			</tbody>\
		</table>\
	</td>\
</tr>';

    /**
     * centreViewOnGraph
     *
     * @param graph
     */
    function centreViewOnGraph(graph) {
        space.perspectiveCamera.position.set((graph.limits.x.max) * 1.5, (graph.limits.y.max) * 1.5,
                (graph.limits.z.max) * 1.5);
    }

    /**
     * showAlert
     *
     * @param id
     * @param text
     */
    function showAlert(id, text) {
        var alert = $(id);
        if (text !== undefined)
            alert.text(text);
        alert.show();
        setTimeout(function () {
            alert.hide();
        }, 5000);
    }

    /**
     * updateGraphList
     *
     * @param space
     * @param graphCount
     */
    function updateGraphList(space, graphCount) {
        while (config.graphs.length > graphCount) {
            space.removeGraph(config.graphs[config.graphs.length - 1]);
            config.graphs.pop();
        }
        var newGraph;
        while (config.graphs.length < graphCount) {
            if (config.graphs.length > 0) {
                var lastGraph = config.graphs[config.graphs.length - 1];
                newGraph = new Graph(v(lastGraph.origin.x, (lastGraph.origin.y + lastGraph.limits.y.max - lastGraph.limits.y.min + 150),
                        0), space);

            } else {
                newGraph = new Graph(v(-window.innerWidth / 4.0, -window.innerHeight / 4.0, 0), space);
            }
            newGraph.axisSections = {
                x: 4,
                y: 4,
                z: 4
            };
            newGraph.id = config.graphs.length;
            newGraph.init();
            config.graphs.push(newGraph);
        }
    }

    /**
     * updateGraphConfigList
     */
    function updateGraphConfigList() {
        $('#graphConfigList').html(graphTemplate);
        $p('#graphConfigList').render(config.graphs, directives.graphs);

        $('#graphConfigList tr td div input').on('input', function (e) {
            var graph = parseInt($(this).parent().parent().parent().attr('graph'));
            config.graphs[graph].setName(this.value);
        });
    }

    function initButtons(space) {
        $('#button3DView').on('click', function (event) {
            space.setPerspective(!space.perspective);
        });

        $('#buttonAnimate').on('click', function (event) {
            for (var i in config.graphs) {
                var graph = config.graphs[i];
                if (graph.isAnimating) {
                    graph.stopAnimating();
                } else {
                    graph.animateGraph(config.animTime);
                }
            }
        });
        $('#buttonGrid').on('click', function (event) {
            for (var i in config.graphs) {
                var graph = config.graphs[i];
                graph.showGrid = !graph.showGrid;
                graph.init();
            }
        });
    }

    function initGraphConfig(space) {
        updateGraphList(space, 1);
        updateGraphConfigList();

        $('#gridDropdownList li a').on('click', function (e) {
            var result = updateDropdownText($(this));
            if (result) {
                updateGraphList(space, parseInt($(this).text()));
                updateGraphConfigList();
            }
            return result;
        });
    }

    function updateDropdownText(dropdown) {
        if (!dropdown.parent().hasClass('disabled') && !dropdown.parent().hasClass('dropdown-header')) {
            var btn = dropdown.parent().parent().parent().find('button');
            btn.html(dropdown.text() + ' <span class="caret"></span>');
            return true;
        } else {
            return false;
        }
    }

    function updateLegend(colours) {
        /* Pad lnames with empty names */
        while (config.lnames.length < Object.keys(colours).length) {
            config.lnames.push('');
        }
        for (var i in config.lnames) {
            if (i < Object.keys(colours).length) {
                var index = Object.keys(colours)[i];
                colours[index].index = i;
                colours[index].lname = config.lnames[i];
            }
        }


        $('#legendList').html(legendFlowTemplate);
        $p('#legendList').render(colours, directives.legends);


        $('#legendList').find('a.legendFlow').off('click').on('click', function () {
            var flow = $(this).attr('flow');
            $('#flowNameHeading').text(flow);
            $('#flowNameText').val(colours[flow].lname);
            $('#flowNameText').attr('placeholder', flow);

            $('#flowNameUpdate').off('click').on('click', function () {
                config.lnames[colours[flow].index] = $('#flowNameText').val();
                updateLegend(colours);
            });

            $('#flowName').modal('show');
        });
    }

    function updateDataSourcesFailure(result) {
        $('#metricDataSourceError span.message').html(result);
        $('#metricDataSourceError').show();
        console.log(result);
        hideLoadingPanel();
    }

    /**
     * Separate raw data obtained from server into sets of 2D data for each data
     * set of each flow of each metric
     *
     * [3][2] 1 : 3/2 is one data pair
     * [3] 2 [1]: 3/1 is second data pair
     *
     * @param data
     */
    function parseProperties(data) {
        var i, j;
        /* Cleaup flows (remove anything that hasn't been selected) */
        for (i in flows) {
            if (!(i in data)) {
                delete flows[i];
            } else {
                for (j in flows[i]) {
                    if (!(j in data[i])) {
                        delete flows[i][j];
                    }
                }
            }
        }

        /* Metrics */
        for (i in data) {
            var metric = data[i];
            if (!(i in flows)) {
                flows[i] = {};
            }
            var metricProp = flows[i];
            /* Flows */
            for (j in metric) {
                var flow = metric[j];
                if (!(j in metricProp)) {
                    metricProp[j] = [];
                }
                metricProp[j] = flow;
            }
        }
    }

    function updateFlowMappingTable() {
        var tableData = [];

        for (var i in config.flows) {
            for (var j in config.flows[i]) {
                tableData.push({
                    'metric': i,
                    'flow': config.flows[i][j]
                });
            }
        }

        $('#flowMappingTable').html(flowMappingRowTemplate);
        $p('#flowMappingTable').render(tableData, directives.flowMaps);

        var axisList = function () {
            var optionshtml = '<li><a href="#" metric="NOTHING" flow="" dataset=""><small>Nothing</small></a></li>\
			<li><a href="#" flow="" metric="TIME" dataset=""><small>Time</small></a></li>';

            for (var i in flows) {
                var metric = flows[i];
                optionshtml += '<li class="disabled"><a href="#">' + i + '</a></li>';
                /* Sort the metrics so that they are in the same order as the flow list */
                var metricFlowList = Object.keys(metric).sort()
                for (var j in metricFlowList) {
                    var flowName = metricFlowList[j];
                    optionshtml += '<li><a href="#" metric="' + i + '" flow="' + flowName +
                            '" ><small>' + flowName + '</small></a></li>';

                }
            }
            return optionshtml;
        }();

        /* Populate data set dropdown with data set indices for the flow/metric*/

        $('#flowMappingTable').find('.flowMapRowDataSet').each(function () {
            var metric = $(this).closest('.flowMapRow').find('.flowMapRowMetric').text();
            var flow = $(this).closest('.flowMapRow').find('.flowMapRowFlow').text();
            var options = $(this).find('ul');
            var optionshtml = '';
            var count = flows[metric][flow].length;
            for (var i = 0; i < count; i++) {
                optionshtml += '<li><a href="#">' + i + '</a></li>';
            }
            options.html(optionshtml);

            $(this).find('a').off('click').on('click', function (e) {
                updateDropdownText($(this));
            });
        });

        /* Populate graph dropdown with graph indices */

        $('#flowMappingTable').find('.flowMapRowGraph').each(function () {
            var count = config.graphs.length;
            var options = $(this).find('ul');
            var optionshtml = '';
            for (var i = 0; i < count; i++) {
                optionshtml += '<li><a href="#">' + (i + 1) + '</a></li>';
            }
            options.html(optionshtml);

            $(this).find('a').off('click').on('click', function (e) {
                return updateDropdownText($(this));
            });
        });

        /* Populate x and z axis dropdowns with other metrics and flows */

        $('#flowMappingTable').find('.flowMapRowXAxis').each(function () {
            var options = $(this).find('ul');
            options.html(axisList);
            $(this).find('a').off('click').on('click', function (e) {
                var button = $(this).parent().parent().parent().find('button');
                button.attr('metric', $(this).attr('metric'));
                button.attr('flow', $(this).attr('flow'));
                button.attr('dataset', $(this).attr('dataset'));
                return updateDropdownText($(this));
            });
        });
        $('#flowMappingTable').find('.flowMapRowZAxis').each(function () {
            var options = $(this).find('ul');
            options.html(axisList);
            $(this).find('a').off('click').on('click', function (e) {
                var button = $(this).parent().parent().parent().find('button');
                button.attr('metric', $(this).attr('metric'));
                button.attr('flow', $(this).attr('flow'));
                button.attr('dataset', $(this).attr('dataset'));
                return updateDropdownText($(this));
            });
        });
    }

    function updateFlowSelection() {
        var sorted = {};
        /* Push flows into an array in order to sort them */
        for (var metric in flows) {
            var sortedFlows = [];
            for (var i in flows[metric]) {
                var flow = flows[metric][i];
                flow.flow = i;
                sortedFlows.push(flow);
            }

            /* Lexically sort the flow names */
            sortedFlows.sort(function (a, b) {
                return a.flow.localeCompare(b.flow);
            });
            sorted[metric] = sortedFlows;
        }

        $('#flowSelectionTable').html(flowRowTemplate);
        $p('#flowSelectionTable').render(sorted, directives.flows);
        config.flows = {};

        $('#flowSelectionTable').find('input').off('change').on('change', function () {
            var metric = $(this).closest('.flowRow').find('.flowRowName').text();
            var flow = $(this).closest('.flowSubRow').find('.flowSubRowTitle').text();
            if ($(this).is(':checked')) {
                if (!(metric in config.flows)) {
                    config.flows[metric] = [];
                }
                if (config.flows[metric].indexOf(flow) === -1) {
                    config.flows[metric].push(flow);
                }
            } else {
                if (metric in config.flows && config.flows[metric].indexOf(flow) > -1) {
                    config.flows[metric].splice(config.flows[metric].indexOf(flow), 1);
                }
            }

            updateFlowMappingTable();
        });
    }

    function updateDataSourcesSuccess(result) {
        var resultCode = result.result;
        if (resultCode === 'Success') {
            $('#metricSelection').modal('hide');
            parseProperties(result.data);
            updateFlowSelection();
        } else {
            $('#metricDataSourceError span.message').html(resultCode);
            $('#metricDataSourceError').show();
        }
        hideLoadingPanel();
    }

    function updateDataSources() {
        showLoadingPanel();
        config.src_filter = $('#metricsTabDataSourcesFilter').val();
        $.ajax({
            type: "POST",
            url: "/api/metrics/get/",
            data: JSON.stringify({
                'exp_id': config.exp_id,
                'src_filter': config.src_filter,
                'metrics': config.metrics,
                'yscale': config.yscale
            }),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: updateDataSourcesSuccess,
            failure: updateDataSourcesFailure,
        });
    }

    function highest(data) {
        var y = 0, x = 0, z = 0;
        for (var k in data) {
            if (data[k][1] > y)
                y = data[k][1];
            if (data[k][0] > x)
                x = data[k][0];
            if (data[k].length === 3 && data[k][2] > z)
                z = data[k][2];
        }
        return v(x, y, z);
    }

    function getGraphSuccess(data) {

        $('#flowSelection').modal('hide');
        $('#flowUpdateButton').removeAttr('disabled');
        hideLoadingPanel();

        if (data.result === 'Success') {
            var highestValues = {};
            var highestX = 0;
            var colours = {};
            var i;
            /* Iterate through and ascertain highest values
             * prior to plotting */
            for (i in data.data) {
                var mapData = data.data[i];
                var map = config.mapping[mapData.map];
                var graphIndex = map.graph;
                var high = highest(mapData.plot[0]);
                var graph = space.graphList[map.graph];
                if (highestValues[graphIndex] === undefined) {
                    highestValues[graphIndex] = v(0.0, 0.0, 0.0);
                }
                if (highestX < high.x) {
                    highestX = high.x;
                }
                if (highestValues[graphIndex].y < high.y) {
                    highestValues[graphIndex].y = high.y;
                }
                if (highestValues[graphIndex].z < high.z) {
                    highestValues[graphIndex].z = high.z;
                }
            }

            for (var i in space.graphList) {
                if (highestValues[i] !== undefined) {
                    var graph = space.graphList[i];
                    graph.axisLabelRange.z.max = highestValues[i].z;
                    graph.axisLabelRange.y.max = highestValues[i].y;
                    graph.axisLabelRange.x.max =highestX;
                }
            }

            for (i in data.data) {
                var mapData = data.data[i];
                var map = config.mapping[mapData.map];
                var graphIndex = map.graph;
                var graph = space.graphList[map.graph];
                graph.init();
                var dataSeries = new DataSeries();
                dataSeries.data = mapData.plot[0];
                dataSeries.yScale = graph.limits.y.max / graph.axisLabelRange.y.max;
                if (colours[map.flow] === undefined) {
                    var colourIndex = Object.keys(colours).length % colourList.length;
                    var colour = colourList[colourIndex];
                    colours[map.flow] = v(colour.r, colour.b, colour.g);
                }
                dataSeries.colour = colours[map.flow];
                dataSeries.xScale = graph.limits.x.max / graph.axisLabelRange.x.max;
                dataSeries.zScale = highestValues[graphIndex].z === 0.0 ? 1.0 : (graph.limits.z.max / graph.axisLabelRange.z.max);
                var plot = new Plot(dataSeries, 0);
                graph.addPlot(plot);

                graph.setAxisLabel('x', map.xaxis.metric);
                graph.setAxisLabel('y', map.metric);
                graph.setAxisLabel('z', map.zaxis.metric);

                if (graph.graphName === '')
                    graph.setName(map.metric);


            }
            updateStartAndEndTime(highestX);

            updateLegend(colours);
        } else {
            console.log('API Error: ' + data.result);
        }
    }

    function updateStartAndEndTime(highestTime) {
        var xMinPercent = 0.0, xMaxPercent = 100.0;
        if (((config.stime < config.etime) ||
            (config.stime > 0 && config.etime === 0.0)) &&
            config.etime < highestTime) {
            if (config.stime > 0.0) {
                xMinPercent = parseFloat((config.stime / highestTime * 100.0).toFixed(1));
            }

            if (config.etime > 0.0) {
                xMaxPercent = parseFloat((config.etime / highestTime * 100.0).toFixed(1));
            }
        }

        updateControlXMinSlider(xMinPercent);
        updateControlXMaxSlider(xMaxPercent);
        updateLabels();
    }

    function getGraphFailure(result) {
        console.log('Failure: ' + result);
        $('#flowSelection').modal('hide');
        $('#flowUpdateButton').removeAttr('disabled');
        hideLoadingPanel();
    }

    function getFilename(metric, flow) {
        if (metric === 'TIME' || metric === 'NOTHING') {
            return metric;
        } else {
            return flows[metric][flow].filename;
        }

    }

    function updateView() {
        var i;
        for (i in space.graphList) {
            space.graphList[i].deletePlots();
        }
        var data = [];

        for (i in config.mapping) {
            var map = config.mapping[i];
            var xmetric = map.xaxis.metric;
            var ymetric = map.metric;
            var zmetric = map.zaxis.metric;
            var mapData = {
                'map': i,
                'x': {
                    'metric': xmetric,
                    'dataset': map.xaxis.dataset,
                    'file': getFilename(xmetric, map.xaxis.flow),
                    'scale': (xmetric !== 'TIME' && xmetric !== 'NOTHING' ? config.yscale[xmetric] : 1.0)
                },
                'y': {
                    'metric': ymetric,
                    'dataset': map.dataset,
                    'file': getFilename(ymetric, map.flow),
                    'scale': config.yscale[ymetric],
                    'group' : flows[ymetric][map.flow].group
                },
                'z': {
                    'metric': zmetric,
                    'dataset': map.zaxis.dataset,
                    'file': getFilename(zmetric, map.zaxis.flow),
                    'scale': (zmetric !== 'TIME' && zmetric !== 'NOTHING' ? config.yscale[zmetric] : 1.0)
                }
            };

            data.push(mapData);
        }

        $.ajax({
            type: "POST",
            url: "/api/graph/",
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: getGraphSuccess,
            failure: getGraphFailure,
        });

    }

    function updateFlows() {

        /* Save list of flow maps */
        config.mapping = [];
        $('.flowMapRow').each(function (index) {
            var xaxisButton = $(this).find('.flowMapRowXAxis').find('button');
            var zaxisButton = $(this).find('.flowMapRowZAxis').find('button');
            var mapping = {
                metric: $(this).find('.flowMapRowMetric').text(),
                flow: $(this).find('.flowMapRowFlow').text(),
                graph: (parseInt($(this).find('.flowMapRowGraph').find('button').text()) - 1) || 0,
                dataset: parseInt($(this).find('.flowMapRowDataSet').find('button').text()) || 0,
                xaxis: {
                    flow: xaxisButton.attr('flow'),
                    dataset: parseInt(xaxisButton.attr('dataset')) || 0,
                    metric: xaxisButton.attr('metric')
                },
                zaxis: {
                    flow: zaxisButton.attr('flow'),
                    dataset: parseInt(zaxisButton.attr('dataset')) || 0,
                    metric: zaxisButton.attr('metric')
                }
            };
            config.mapping.push(mapping);
        });
        if (config.mapping.length > 0) {
            showLoadingPanel();
            $('#flowUpdateButton').attr('disabled', true);
            updateView();
        }
    }

    function updateYScales() {
        $('#metricsTabDataSourcesTable tr td input.yscale').each(function (index) {
            /* TODO: Replace parent()s with closest() */
            var metric = $(this).parent().parent().find('.metricTableRowName').html();
            var yscale = parseFloat($(this).val()) || 1.0;
            config.yscale[metric] = yscale;
        });
    }

    function initMetricSelection() {
        $('#metricDataSourceError').hide();
        $('#metricDataSourceError button').on('click', function () {
            $(this).parent().hide();
        });

        $.getJSON('/api/metrics', function (data) {
            var metricList = data.metrics;
            $('#metricsTabDataSourcesTable').html(metricTableRowTemplate);
            $p('#metricsTabDataSourcesTable').render(metricList, directives.metrics);

            $('#metricsTabDataSourcesTable tr').each(function (index) {
                var metric = $(this).find('.metricTableRowName').html();
                if (config.metrics.indexOf(metric) > -1) {
                    $(this).find('td div input').prop('checked', true);
                }
                if (metric in config.yscale) {
                    $(this).find('td input.yscale').val(config.yscale[metric]);
                }
            });

            $('#metricsTabDataSourcesTable tr td div input').on('change', function () {
                /* TODO: Replace parent()s with closest() */
                var metric = $(this).parent().parent().parent().parent().find('.metricTableRowName').text();
                var index = config.metrics.indexOf(metric);
                if (index === -1) {
                    config.metrics.push(metric);
                } else {
                    config.metrics.splice(index, 1);
                }
            });

            hideLoadingPanel();
        });

        showLoadingPanel();
    }

    function initExpIDList() {
        $.getJSON('/api/experiments', function (data) {
            if (data.result === 'Success') {
                $('#metricsTabDataSourcesExp').html(expIdTableTemplate);
                $p('#metricsTabDataSourcesExp').render(data.experiments, directives.expids);

                $('#metricsTabDataSourcesExp tr td div input').on('change', function () {
                    /* TODO: Replace parent()s with closest() */
                    var expId = $(this).parent().parent().parent().parent().find('.expIdTableName').text();
                    var index = config.exp_id.indexOf(expId);
                    if (index === -1) {
                        config.exp_id.push(expId);
                    } else {
                        config.exp_id.splice(index, 1);
                    }
                });

                $('#metricsTabDataSourcesExp tr td div input').each(function () {
                    /* TODO: Replace parent()s with closest() */
                    var expId = $(this).parent().parent().parent().parent().find('.expIdTableName').text();
                    var index = config.exp_id.indexOf(expId);
                    if (index > -1) {
                        $(this).attr('checked', true);
                    }
                });
            } else {
                console.log(data.result);
            }
        });
    }

    function updateLimits(axis, parameter, value) {
        config.graph[axis][parameter] = value;
        for (var i in space.graphList) {
            space.graphList[i].zoom(config.graph);
        }
    }

    function updateLabels() {
        for (var i in space.graphList) {
            space.graphList[i].zoomLabels(config.graph);
        }
    }

    function updateControlXMaxSlider(value) {
        $('#controlXMin').slider('option', 'max', value);
        updateLimits('x', 'max', value);
        $('#controlXMax').closest('div.control-container').find('.control-display').text(value + '%');
        $('#controlXMax').slider('option', 'value', value);
    }
    function updateControlXMinSlider(value) {
        $('#controlXMax').slider('option', 'min', value);
        updateLimits('x', 'min', value);
        $('#controlXMin').closest('div.control-container').find('.control-display').text(value + '%');
        $('#controlXMin').slider('option', 'value', value);
    }

    function updateControlRanges(space) {
        var controlXMin = $('#controlXMin');
        var controlXMax = $('#controlXMax');
        var controlYMin = $('#controlYMin');
        var controlYMax = $('#controlYMax');
        var controlZMin = $('#controlZMin');
        var controlZMax = $('#controlZMax');

        controlXMin.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.x.min
        });
        controlXMax.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.x.max
        });
        controlYMin.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.y.min
        });
        controlYMax.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.y.max
        });
        controlZMin.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.z.min
        });
        controlZMax.slider({
            max: 100.0,
            min: 0.0,
            step: 0.1,
            value: config.graph.z.max
        });

        $('.control-display').each(function () {
            $(this).text($(this).closest('div').find('.control-slider').slider("option", "value") + '%');
        });

        controlXMax.on('slide', function (event, ui) {
            updateControlXMaxSlider(ui.value);
        });

        controlXMin.on('slide', function (event, ui) {
            updateControlXMinSlider(ui.value);
        });

        controlYMax.on('slide', function (event, ui) {
            controlYMin.slider('option', 'max', ui.value);
            updateLimits('y', 'max', ui.value);
            $(this).closest('div.control-container').find('.control-display').text(ui.value + '%');
        });
        controlYMin.on('slide', function (event, ui) {
            controlYMax.slider('option', 'min', ui.value);
            updateLimits('y', 'min', ui.value);
            $(this).closest('div.control-container').find('.control-display').text(ui.value + '%');
        });

        controlZMax.on('slide', function (event, ui) {
            controlZMin.slider('option', 'max', ui.value);
            updateLimits('z', 'max', ui.value);
            $(this).closest('div.control-container').find('.control-display').text(ui.value + '%');
        });
        controlZMin.on('slide', function (event, ui) {
            controlZMax.slider('option', 'min', ui.value);
            updateLimits('z', 'min', ui.value);
            $(this).closest('div.control-container').find('.control-display').text(ui.value + '%');
        });

        $('.control-slider').on('slidestop', function (event, ui) {
            updateLabels();
        });
    }

    function hideLoadingPanel() {
        $('.loadPanel').removeClass('loadPanel-show');
        $('.metricsUpdateButton').removeAttr('disabled');
    }
    function showLoadingPanel() {
        $('.loadPanel').addClass('loadPanel-show');
        $('.metricsUpdateButton').attr('disabled', 'disabled');
    }

    function initAnimationSlider() {
        var animSlider = $('#controlAnimationTime');
        var animDisplay = $('#animationTimeDisplay');
        animDisplay.text(config.animTime + ' ms');
        animSlider.slider({
            max: 30000,
            min: 50,
            step: 50,
            value: config.animTime
        });

        animSlider.on('slide', function (event, ui) {
            config.animTime = ui.value;
            animDisplay.text(config.animTime + ' ms');
        });
    }
    function arrayToTeacupArg(array) {
        var arg = ''
        for (var i in array) {
            arg += array[i];
            if (i < (array.length - 1)) {
                arg += ';';
            }
        }
        return arg;
    }

    function exportView() {
        var metrics = arrayToTeacupArg(config.metrics);
        var test_ids = arrayToTeacupArg(config.exp_id);
        var lnames = arrayToTeacupArg(config.lnames);
        var graph_names = '';

        for (var i in config.graphs) {
            graph_names += config.graphs[i].graphName;
            if (i < (config.graphs.length - 1)) {
                graph_names += ';';
            }
        }

        $('#exportViewText').val('fab animate:metric="' + metrics +
                '",test_id="' + test_ids + '",source_filter="' +
                config.src_filter + '",lnames="' + lnames + '",graph_count="' +
                config.graphs.length + '",graph_names="' + graph_names +
                '",etime="' + config.etime + '",stime="' + config.stime + '"');
        $('#exportView').modal('show');

    }

    function loadDefaultView(space) {
        $.getJSON('/api/default', function (data) {
            config.exp_id = data.test_id;
            config.src_filter = data.source_filter;
            config.metrics = data.metric;

            config.lnames = data.lnames;

            updateGraphList(space, data.graph_count);

            for (var i = 0; i < data.graph_names.length; i++) {
                if (i < data.graph_count) {
                    config.graphs[i].setName(data.graph_names[i]);
                }
            }

            updateDataSources();

            config.stime = data.stime;
            config.etime = data.etime;
        });
    }

    $(document).ready(function () {
        space = new GraphSpace('threejs');
        space.init();

        initButtons(space);
        initGraphConfig(space);
        updateControlRanges(space);

        initAnimationSlider();

        $('#metricSelection').on('shown.bs.modal', function () {
            showLoadingPanel();
            initMetricSelection();
            initExpIDList();
        });


        colourList = [
            new THREE.Color('#f44336'),
            new THREE.Color('#3f51b5'),
            new THREE.Color('#4caf50'),
            new THREE.Color('#ff9800'),
            new THREE.Color('#2196f3'),
            new THREE.Color('#009688'),
            new THREE.Color('#ffeb3b'),
            new THREE.Color('#00bcd4'),
            new THREE.Color('#cddc39'),
            new THREE.Color('#607d8b')
        ];
        $('.metricsUpdateButton').off('click').on('click', function () {
            showLoadingPanel();
            updateYScales();
            updateDataSources();
        });

        $('#flowUpdateButton').off('click').on('click', function () {
            updateFlows();
        });

        $('#graphConfig').on('shown.bs.modal', function () {
            updateGraphConfigList();
        });

        $('#buttonExport').off('click').on('click', function () {
            exportView();
        });
        $('#buttonReset').off('click').on('click', function () {
            space.resetView();
        });

        loadDefaultView(space);
    });


})();

function init() {
    "use strict";
    /**
     * Initialisation function
     */


}