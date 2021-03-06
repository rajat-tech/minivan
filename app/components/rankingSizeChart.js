'use strict'

/* Services */

angular
  .module('app.components.rankingSizeChart', [])

  .directive('rankingSizeChart', function($timeout, dataLoader, scalesUtils) {
    return {
      restrict: 'A',
      template: '<small style="opacity:0.5;">loading</small>',
      scope: {
        att: '=',
        isSelected: '='
      },
      link: function($scope, el, attrs) {
        var container = el[0]

        $scope.$watch('att', redraw)
        $scope.$watch('isSelected', function() {
          $timeout(redraw, 200)
        })
        window.addEventListener('resize', redraw)

        $scope.$on('$destroy', function() {
          window.removeEventListener('resize', redraw)
        })

        var g = dataLoader.get().g

        function redraw() {
          $timeout(function() {
            container.innerHTML = ''

            var settings = {}
            settings.max_bars = 10
            settings.bar_spacing = 3
            settings.size_box_width = 18
            settings.max_node_size = 16
            settings.percent_box_width = 36
            settings.label_in_out_threshold = 0.4

            // Size scales
            var areaScale = scalesUtils.getAreaScale(
              $scope.att.min,
              $scope.att.max,
              $scope.att.areaScaling.min,
              $scope.att.areaScaling.max,
              $scope.att.areaScaling.interpolation
            )
            var rScale = scalesUtils.getRScale()

            var data = scalesUtils.buildModalities($scope.att)

            // set the dimensions and margins of the graph
            var margin = {
                top: 0,
                right: 6,
                bottom: 0,
                left: 6 + settings.size_box_width + settings.percent_box_width
              },
              width = container.offsetWidth - margin.left - margin.right,
              height = container.offsetHeight - margin.top - margin.bottom

            // set the ranges
            var y = d3
              .scaleBand()
              .range([(height * Math.min(data.length, 10)) / 10, 0])

            var x = d3.scaleLinear().range([0, width])

            var svg = d3
              .select(container)
              .append('svg')
              .attr('width', width + margin.left + margin.right)
              .attr('height', height + margin.top + margin.bottom)
              .append('g')
              .attr(
                'transform',
                'translate(' + margin.left + ',' + margin.top + ')'
              )

            // Scale the range of the data in the domains
            x.domain([
              0,
              d3.max(data, function(d) {
                return d.count
              })
            ])
            y.domain(
              data
                .map(function(d) {
                  return d.average
                })
                .filter(function(d, i) {
                  return i < settings.max_bars
                })
            )

            // append the rectangles for the bar chart
            var bars = svg.selectAll('.bar').data(data)

            bars
              .enter()
              .append('rect')
              .attr('class', 'bar')
              .attr('width', function(d) {
                return x(d.count)
              })
              .attr('y', function(d) {
                return y(d.average)
              })
              .attr('height', y.bandwidth() - settings.bar_spacing)
              .attr('fill', 'rgba(160, 160, 160, 0.5)')

            // Text labels
            var labels = bars
              .enter()
              .append('text')
              .attr('x', function(d) {
                if (x(d.count) > width * settings.label_in_out_threshold) {
                  return x(d.count) - 3
                } else {
                  return x(d.count) + 3
                }
              })
              .attr('y', function(d) {
                return y(d.average) + y.bandwidth() - settings.bar_spacing - 5
              })
              .text(function(d) {
                return d.label
              })
              .attr('text-anchor', function(d, i) {
                if (x(d.count) > width * settings.label_in_out_threshold) {
                  return 'end'
                } else {
                  return 'start'
                }
              })
              .attr('font-family', 'Quicksand, sans-serif')
              .attr('font-weight', '400')
              .attr('font-size', '12px')
              .attr('fill', 'black')
              .attr('oob', function(d, i, e) {
                // Out of bounds
                if (e[i].getBBox().x < 0) {
                  d.oob = true
                  return 'true'
                } else {
                  d.oob = false
                  return 'false'
                }
              })

            // Labels: Adjust placement issues
            labels
              .attr('text-anchor', function(d, i, e) {
                if (d.oob) {
                  return 'start'
                } else {
                  if (x(d.count) > width * settings.label_in_out_threshold) {
                    return 'end'
                  } else {
                    return 'start'
                  }
                }
              })
              .attr('x', function(d, i, e) {
                if (d.oob) {
                  return 3
                } else {
                  if (x(d.count) > width * settings.label_in_out_threshold) {
                    return x(d.count) - 3
                  } else {
                    return x(d.count) + 3
                  }
                }
              })
              .attr('font-weight', function(d, i, e) {
                if (d.oob) {
                  return '500'
                } else {
                  if (x(d.count) > width * settings.label_in_out_threshold) {
                    return '500'
                  } else {
                    return '400'
                  }
                }
              })

            // Size boxes
            bars
              .enter()
              .append('circle')
              .attr(
                'cx',
                -settings.percent_box_width - settings.size_box_width / 2
              )
              .attr('cy', function(d) {
                return y(d.average) + (y.bandwidth() - settings.bar_spacing) / 2
              })
              .attr('r', function(d) {
                return rScale(areaScale(d.average)) * settings.max_node_size
              })
              .attr('fill', '#666')

            // Percent labels
            var labels = bars
              .enter()
              .append('text')
              .attr('x', -6)
              .attr('y', function(d) {
                return y(d.average) + y.bandwidth() - settings.bar_spacing - 5
              })
              .text(function(d) {
                return Math.round((100 * d.count) / g.order) + '%'
              })
              .attr('text-anchor', 'end')
              .attr('font-family', 'Quicksand, sans-serif')
              .attr('font-weight', '400')
              .attr('font-size', '12px')
              .attr('fill', 'black')
          })
        }
      }
    }
  })
