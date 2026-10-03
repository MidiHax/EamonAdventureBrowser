// Builds and renders a Cytoscape graph of an adventure's room connections.
//
// Room exit encoding (room.data[0..9] = N,S,E,W,U,D,NE,NW,SE,SW):
//   0          no exit
//   1..999     room number
//   1000 + N   door artifact N (type 8); destination is the door's data[4],
//              key artifact is data[5], hidden flag is data[7]
//   -999       exit the adventure
//   other < 0  special exit handled by the adventure's own program code
var EamonMap = (function ()
{
    var DIRS = ['N', 'S', 'E', 'W', 'U', 'D', 'NE', 'NW', 'SE', 'SW'];

    var buildElements = function (adv)
    {
        var rooms = {};
        var artifacts = {};
        var nodes = [];
        var edges = {};
        var extraNodes = {};

        _.each(adv.rooms, function (r) { rooms[r.number] = r; });
        _.each(adv.artifacts, function (a) { artifacts[a.number] = a; });

        _.each(adv.rooms, function (r)
        {
            nodes.push({
                data: {
                    id: 'r' + r.number,
                    kind: 'room',
                    number: r.number,
                    label: r.number + ': ' + r.name,
                    name: r.name,
                    description: r.description
                },
                classes: (r.number == 1 ? 'start ' : '') + (r.data[10] == 0 ? 'dark' : '')
            });
        });

        var addExtraNode = function (id, label, cls, info)
        {
            if (!extraNodes[id])
            {
                extraNodes[id] = { data: { id: id, kind: cls, label: label, info: info }, classes: cls };
            }
            return id;
        };

        // Merge all exits between the same pair of nodes into one edge
        var addEdge = function (fromRoom, toId, dir, door)
        {
            var fromId = 'r' + fromRoom;
            var key = fromId < toId ? fromId + '|' + toId : toId + '|' + fromId;
            var e = edges[key];

            if (!e)
            {
                e = edges[key] = { source: fromId, target: toId, srcDirs: [], tgtDirs: [], doors: [] };
            }

            if (e.source == fromId) e.srcDirs.push(dir);
            if (e.target == fromId && fromId != toId) e.tgtDirs.push(dir);
            if (door) e.doors.push(door);
        };

        var resolveRoom = function (fromRoom, n, dir)
        {
            if (rooms[n]) return 'r' + n;

            return addExtraNode('missing' + n, '#' + n + '?', 'missing',
                'Room #' + n + ' is referenced by room #' + fromRoom + ' (' + dir + ') but does not exist.');
        };

        _.each(adv.rooms, function (r)
        {
            for (var i = 0; i < adv.numDirections; i++)
            {
                var v = r.data[i];
                var dir = DIRS[i];

                if (v == 0) continue;

                if (v == -999)
                {
                    addEdge(r.number, addExtraNode('exit', 'Exit', 'exit', 'Leaves the adventure.'), dir);
                }
                else if (v < 0)
                {
                    var spId = addExtraNode('sp' + r.number + '_' + dir, String(v), 'special',
                        'Special exit ' + v + ' from room #' + r.number + ' (' + dir + '). Its destination is decided by the adventure\'s own program code.');
                    addEdge(r.number, spId, dir);
                }
                else if (v >= 1000)
                {
                    var a = artifacts[v - 1000];

                    if (!a || a.data[1] != 8)
                    {
                        addEdge(r.number, addExtraNode('baddoor' + v, 'Door #' + (v - 1000) + '?', 'missing',
                            'Room #' + r.number + ' (' + dir + ') references door artifact #' + (v - 1000) + ', which does not exist or is not a door.'), dir);
                        continue;
                    }

                    var key = a.data[5];
                    var door = {
                        number: a.number,
                        name: a.name,
                        locked: key != 0,
                        hidden: a.data[7] == 1,
                        keyText: key > 0 ? ('#' + key + (artifacts[key] ? ' (' + artifacts[key].name + ')' : '')) : (key < 0 ? 'none - cannot be unlocked normally' : 'none')
                    };

                    var dest = a.data[4];
                    var destId = dest > 0 ? resolveRoom(r.number, dest, dir)
                        : addExtraNode('sp' + r.number + '_' + dir, String(dest), 'special',
                            'Door #' + a.number + ' leads to special location ' + dest + '.');

                    addEdge(r.number, destId, dir, door);
                }
                else
                {
                    addEdge(r.number, resolveRoom(r.number, v, dir), dir);
                }
            }
        });

        var edgeList = _.map(_.values(edges), function (e, idx)
        {
            var oneWay = e.tgtDirs.length == 0 && e.source != e.target && e.target.charAt(0) == 'r';
            var cls = [];

            if (e.doors.length > 0)
            {
                cls.push('door');
                if (_.some(e.doors, function (d) { return d.locked; })) cls.push('locked');
                if (_.some(e.doors, function (d) { return d.hidden; })) cls.push('hidden');
            }
            if (oneWay) cls.push('oneway');

            return {
                data: {
                    id: 'e' + idx,
                    source: e.source,
                    target: e.target,
                    srcLabel: e.srcDirs.join(','),
                    tgtLabel: e.tgtDirs.join(','),
                    doors: e.doors,
                    oneWay: oneWay,
                    label: _.some(e.doors, function (d) { return d.locked; }) ? '🔒' : ''
                },
                classes: cls.join(' ')
            };
        });

        return nodes.concat(_.values(extraNodes)).concat(edgeList);
    };

    var style = [
        { selector: 'node', style: {
            'label': 'data(label)', 'font-size': 9, 'text-wrap': 'wrap', 'text-max-width': 110,
            'text-valign': 'bottom', 'text-margin-y': 3, 'width': 22, 'height': 22,
            'background-color': '#f4a460', 'border-width': 1, 'border-color': '#8b4513'
        } },
        { selector: 'node.dark', style: { 'background-color': '#666', 'border-color': '#222' } },
        { selector: 'node.start', style: { 'border-width': 4, 'border-color': '#2e8b57' } },
        { selector: 'node.exit', style: {
            'shape': 'round-rectangle', 'width': 44, 'background-color': '#2e8b57',
            'label': 'data(label)', 'text-valign': 'center', 'text-margin-y': 0, 'color': '#fff', 'font-weight': 'bold'
        } },
        { selector: 'node.special', style: {
            'shape': 'diamond', 'width': 16, 'height': 16, 'background-color': '#9370db', 'border-color': '#4b0082'
        } },
        { selector: 'node.missing', style: {
            'shape': 'triangle', 'width': 18, 'height': 18, 'background-color': '#dc143c', 'border-color': '#8b0000'
        } },
        { selector: 'edge', style: {
            'width': 2, 'line-color': '#8b4513', 'curve-style': 'bezier',
            'source-label': 'data(srcLabel)', 'target-label': 'data(tgtLabel)',
            'source-text-offset': 18, 'target-text-offset': 18, 'font-size': 8, 'color': '#555',
            'label': 'data(label)', 'text-background-color': 'beige', 'text-background-opacity': 1
        } },
        { selector: 'edge.door', style: { 'line-style': 'dashed', 'line-color': '#1e90ff' } },
        { selector: 'edge.hidden', style: { 'line-style': 'dotted', 'width': 3 } },
        { selector: 'edge.oneway', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': '#8b4513' } },
        { selector: 'edge.door.oneway', style: { 'target-arrow-color': '#1e90ff' } },
        { selector: '.hideDirs', style: { 'source-label': '', 'target-label': '' } },
        { selector: ':selected', style: { 'overlay-color': '#ffd700', 'overlay-opacity': 0.4 } }
    ];

    var describe = function (el)
    {
        var d = el.data();

        if (el.isNode())
        {
            if (d.kind == 'room')
            {
                return '<b>Room #' + d.number + ': ' + _.escape(d.name) + '</b><br/>' + _.escape(d.description);
            }
            return _.escape(d.info);
        }

        var s = el.source().data(), t = el.target().data();
        var html = '<b>' + _.escape(s.label) + '</b> &harr; <b>' + _.escape(t.label) + '</b>';

        if (d.oneWay) html += '<br/>One-way: no exit leads back.';

        _.each(d.doors, function (door)
        {
            html += '<br/>Door #' + door.number + ' (' + _.escape(door.name) + ')'
                + (door.hidden ? ' - hidden' : '')
                + (door.locked ? ' - locked, key: ' + _.escape(door.keyText) : '');
        });

        return html;
    };

    var cy = null;
    var zoomEl = null;

    // Slider position (0-100) maps logarithmically onto the zoom range
    var MIN_ZOOM = 0.05, MAX_ZOOM = 4;

    var zoomToSlider = function (z)
    {
        return Math.round(100 * Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM));
    };

    var sliderToZoom = function (v)
    {
        return MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, v / 100);
    };

    var syncSlider = function ()
    {
        if (cy && zoomEl) zoomEl.value = zoomToSlider(cy.zoom());
    };

    return {
        render: function (container, adv, advId, infoEl, sliderEl)
        {
            if (cy) cy.destroy();

            cy = cytoscape({
                container: container,
                elements: buildElements(adv),
                style: style,
                layout: { name: 'cose', animate: false, nodeRepulsion: 12000, idealEdgeLength: 60, randomize: true },
                minZoom: MIN_ZOOM,
                maxZoom: MAX_ZOOM,
                wheelSensitivity: 0.3
            });

            zoomEl = sliderEl;
            syncSlider();
            cy.on('zoom', syncSlider);

            cy.on('mouseover', 'node, edge', function (evt) { $(infoEl).html(describe(evt.target)); });

            cy.on('tap', 'node', function (evt)
            {
                var d = evt.target.data();
                if (d.kind == 'room') window.location.hash = '#/adv/' + advId + '/room/' + d.number;
            });
        },

        showDirections: function (show)
        {
            if (cy) cy.edges().toggleClass('hideDirs', !show);
        },

        fit: function ()
        {
            if (cy) cy.fit(30);
        },

        // Zoom about the centre of the view; v is the slider position (0-100)
        setZoom: function (v)
        {
            if (cy) cy.zoom({ level: sliderToZoom(v), renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
        },

        // Download the whole map (not just the visible area) as a PNG
        exportPng: function (fileName)
        {
            if (!cy) return;

            var blob = cy.png({ output: 'blob', full: true, scale: 2, maxWidth: 8000, maxHeight: 8000, bg: '#fffdf0' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');

            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        },

        zoomBy: function (step)
        {
            if (zoomEl) this.setZoom(Math.max(0, Math.min(100, parseInt(zoomEl.value) + step)));
        }
    };
})();
