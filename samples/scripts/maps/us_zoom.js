var container_parent = $('.display') ,
	chart_container = $('#map'),
	margins = {top: 20, right: 20, bottom: 20, left: 20},
	width = container_parent.width(),
	height = (width * .5),
	vis, vis_group, aspect, centered, response

var apiBase = 'http://api.usatoday.com/open/',
	api = 'census/',
	apiType = 'rac',
	sumlevid = '&sumlevid=2',
	apiKey = '&api_key=cnuurrmbcaya2snguar74zkv',
	callback = '&callback=?'

var projection = d3.geo.albersUsa()
	.scale(width)
	.translate([ width/2, height/2 ])

var path = d3.geo.path()
	.projection(projection)

// do you have to have two?
var over_tooltip = d3.select('body').append('div')
	.attr({
        'class': 'over_tooltip'
    })
	.style({
        'opacity': 1e-6
    })

var tooltip = d3.select('.us_map').append('div')
    .attr({
        'class': 'tooltip'
    })
    .style({
        'opacity': 1e-6
    })

vis = d3.select('#map').append('svg')
	.attr({
		'width': width,
		'height': height,
		'preserveAspectRatio': 'xMinYMid',
		'viewBox': '0 0 ' + (width) + ' ' + (height)
	})

vis_group = vis.append('g')
aspect = chart_container.width() / chart_container.height()

// draw the background rect for clicking (zoom out) purposes
vis.append('rect')
	.attr({
		'class': 'background',
		'width': width,
		'height': height,
        'fill': 'none',
		'data-type': function(d){
			return 'rect'
		},
	})
    .style({
        'pointer-events': 'all'
    })
	.on({
		'click': clicked
	})

var g = vis.append('g')

var names = {}

d3.tsv('../data/us-state-names.tsv', function(tsv){
    tsv.forEach(function(d, i){
        names[d.id] = {
            'name': d.name,
            'code': d.code,
            'party': d.party
        }
    })
})

d3.json('../data/us.json', function(error, topology){
    // console.log(names)

    function state_party_fill(d){
        var party = names[d.id].party
        if(party == 'Republican'){
            return '#e91d0e'
        } else if(party == 'Democrat'){
            return '#003264'
        } else if(party == 'Split'){
            return 'purple'
        } else {
            return 'white'
        }
    }

	g.append('g')
		.selectAll('path')
			.data(topojson.feature(topology, topology.objects.states).features)
		.enter().append('path')
			.attr({
				'd': path,
				'data-type': function(d){
					return 'state'
				},
				'data-type-name': function(d){
					return names[d.id].code
				},
                'fill': function(d){
                    return state_party_fill(d)
                },
                'stroke': '#fff',
                'stroke-width': .5
			})
			.on({
				'click': clicked
			})
            .on('mouseover', function(d){
                d3.select(this)
                    .transition()
                        .duration(500)
                        .attr({
                            'fill': '#666'
                        })
                    .style('cursor', 'pointer')

                over_tooltip.html(function() {
                        var tooltip_template_raw = '<p><strong>' + names[d.id].name + '</strong></p> \
                        <p>' + names[d.id].code + ' State ID: ' + d.id + '</p> \
                        <p>Primary party: ' + _.capitalize(names[d.id].party) + '</p>'

                        var tooltip_data = _.template(tooltip_template_raw, {
                            // state_info: stateData
                        })
                        return tooltip_data
                    })
                    .style({
                        'left': (d3.event.pageX) + 'px',
                        'top': (d3.event.pageY - 28) + 'px'
                    })
                    .transition()
                        .duration(500)
                        .style('opacity', 1) 
            })
            .on('mouseout', function(d){
                d3.select(this)
                    .transition()
                        .duration(500)
                        .attr({
                            'fill': function(d){
                                return state_party_fill(d)
                            }
                        })
                over_tooltip.transition()
                        .duration(200)
                        .style({
                            'opacity': 0
                        }) 
            })

	// g.append('path')
	// 	.datum(topojson.mesh(topology, topology.objects.states, function(a, b){
	// 		return a !== b
	// 	}))
	// 	.attr({
	// 		'id': 'state-borders',
	// 		'd': path
	// 	})
})

function clicked(d){
	var current_type = $(this).context.dataset.type
	if(current_type == 'state'){
		state = $(this).context.dataset.typeName
	}
	
	var keypat = '?keypat=' + state
	var searchString = apiBase + api + apiType + keypat + sumlevid + apiKey + callback

	$.getJSON(searchString, function(data){
		drawIt(data.response[0])
	})

	var x, y, k

	var drawIt = function(stateData){

		if(d && centered !== d && current_type == 'state'){
			var centroid = path.centroid(d)
			x = centroid[0]
			y = centroid[1]
			k = 4
			centered = d
		} else {
			x = width / 2
			y = height / 2
			k = 1
			centered = null
		}

		g.selectAll('text')
			.transition()
				.duration(500)
				.attr({
					opacity: 0
				})
			.remove()

		if(current_type == 'state'){
			g.append('text')
				.attr({
					'fill': 'rgba(255,255,255,1)',
					'opacity': 0,
					'transform': 'translate(' + x + ',' + y + ')',
                    'text-anchor': 'middle'
				})
				.text(state)
				.transition()
					.duration(750)
					.attr({
						opacity: 1
					})

            tooltip
                .transition()
                    .duration(500)
                    .style({
                        'opacity': function(){
                            return 1
                        }
                    })
		} else {
            tooltip.transition()
                .duration(500)
                .style({
                    'opacity': 0
                })
        }

		var p = $('#map'),
            position = p.position()

		var template_raw = '<h5>Race Info for ' + stateData.Placename + '</h5> \
			<table> \
                <tr> \
                    <td>Caucasian</td> \
                    <td>' + (stateData.PctWhite * 100).toFixed(2) + '%</td> \
                </tr> \
                <tr> \
                    <td>African American</td> \
                    <td>' + (stateData.PctBlack * 100).toFixed(2) + '%</td> \
                </tr> \
                <tr> \
                    <td>Asian American</td> \
                    <td>' + (stateData.PctAsian * 100).toFixed(2) + '%</td> \
                </tr> \
                <tr> \
                    <td>American Indian</td> \
                    <td>' + (stateData.PctAmInd * 100).toFixed(2) + '%</td> \
                </tr> \
                <tr> \
                    <td>Two or More</td> \
                    <td>' + (stateData.PctTwoOrMore * 100).toFixed(2) + '%</td> \
                </tr> \
                <tr> \
                    <td>Hawaiian or Pacific Islander</td> \
                    <td>' + (stateData.PctNatHawOth * 100).toFixed(2) + '%</td> \
                </tr> \
			</table>'

		tooltip.html(function(d) {
				var tooltip_data = _.template(template_raw, {})
				return tooltip_data
			})
			.style({
                'right': (position.left + 120) + 'px',
                'top': (position.top + 200) + 'px'
            })

		g.transition()
			.duration(750)
			.attr({
				'transform': 'translate(' + width / 2 + ',' + height / 2 + ') scale(' + k + ') translate(' + -x + ',' + -y + ')',
                'stroke-width': 1.5 / k + 'px'
			})
	}
}

$(window).on('resize', function() {
	var targetWidth = container_parent.width()
	vis.attr({
		'width': targetWidth,
		'height': Math.round(targetWidth / aspect)
	})
})
