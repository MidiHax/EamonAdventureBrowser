var EamonAdvBrowserModel = function()
{
    var self = this;

    self.loadState = 's';
    self.loadId = null;
    self.searchIndex = 0;
    self.searchResults = ko.observableArray();

    // Setup routes
    self.sammy = $.sammy('#main', function() {

        this.notFound = function()
        {
            self.currentId(null);
            $("#divMainList").show();
            $("#divAdventure").hide();
            $("#divMap").hide();
            $("#divSearch").hide();
            $("#divSearchWait").hide();
        }

        this.get('#/search', function (context) {
            
            $("#divMainList").hide();
            $("#divAdventure").hide();
            $("#divMap").hide();
            $("#divSearch").show();
            $("#divSearchWait").hide();
            $("#btnSearch").prop('disabled', false);
            self.searchResults.removeAll();
        });

        this.get('#/adv/:id', function(context)
        {
            self.loadState = 's';
            self.loadId = null;

            self.safeUpdateUI(this.params['id']);
        });

        this.get('#/adv/:id/map', function(context)
        {
            self.loadState = 'p';
            self.loadId = null;

            self.safeUpdateUI(this.params['id']);
        });

        this.get('#/adv/:id/:type/:num', function(context)
        {
            self.loadState = this.params['type'].substr(0, 1);
            self.loadId = parseInt(this.params['num']);

            self.safeUpdateUI(this.params['id']);
        });

    });

    self.headers = ko.observableArray();
    self.currentId = ko.observable();
    self.adventure = ko.observable();
    self.room = ko.observable();
    self.artifact = ko.observable();
    self.monster = ko.observable();

    self.loadAdventureData = function(id)
    {
        $.get("data/" + id + ".txt", null, function (data) {
            self.adventure(data);
            self.currentId(id);

            self.updateUI();
        }, "json");
    };

    self.safeUpdateUI = function(id)
    {
        if (self.currentId() == id) {
            self.updateUI();
            return;
        }

        self.loadAdventureData(id);
    }

    self.updateUI = function()
    {
        $("#divMap").hide();

        switch(self.loadState)
        {
            case 'p': // Room map

                self.room(null);
                self.artifact(null);
                self.monster(null);

                $("#divMainList").hide();
                $("#divSearch").hide();
                $("#divAdventure").show();
                $("#divAdvSummary").hide();
                $("#divMap").show();

                EamonMap.render($("#divMapCanvas")[0], self.adventure(), self.currentId(), $("#divMapInfo")[0], $("#rngMapZoom")[0]);
                EamonMap.showDirections($("#chkMapDirs").prop('checked'));
                break;

            case 's': // Adventure summary/overview
                
                $("#divMainList").hide();
                $("#divSearch").hide();
                $("#divAdventure").show();
                $("#divAdvSummary").show();

                self.room(null);
                self.artifact(null);
                self.monster(null);

                break;

            case 'r': // Room Detail

                var r = _.findWhere(self.adventure().rooms, { number: self.loadId });

                if (_.isUndefined(r))
                {
                    self.loadState = 's';
                    self.loadId = null;

                    self.updateUI();
                    return;
                }

                self.room(r);
                self.artifact(null);
                self.monster(null);

                $("#divMainList").hide();
                $("#divSearch").hide();
                $("#divAdventure").show();
                $("#divAdvSummary").hide();
                break;

            case 'a': // Artifact Detail

                var a = _.findWhere(self.adventure().artifacts, { number: self.loadId });

                if (_.isUndefined(a)) {
                    self.loadState = 's';
                    self.loadId = null;

                    self.updateUI();
                    return;
                }

                self.room(null);
                self.artifact(a);
                self.monster(null);

                $("#divMainList").hide();
                $("#divSearch").hide();
                $("#divAdventure").show();
                $("#divAdvSummary").hide();
                break;

            case 'm': // Monster Detail

                var m = _.findWhere(self.adventure().monsters, { number: self.loadId });

                if (_.isUndefined(m)) {
                    self.loadState = 's';
                    self.loadId = null;

                    self.updateUI();
                    return;
                }

                self.room(null);
                self.artifact(null);
                self.monster(m);

                $("#divMainList").hide();
                $("#divSearch").hide();
                $("#divAdventure").show();
                $("#divAdvSummary").hide();
                break;

            default:

                alert("Invalid load state: " + self.loadState);
                return;
        }
    }

    self.runSearch = function() /* World's crappiest search "engine" */
    {
        var query = $("#txtSearch").val();

        if (query.trim() == '')
        {
            alert("Please enter a search string.");
            $("#txtSearch").focus();
            return;
        }

        self.searchIndex = 0;
        $("#divSearchWait").show();
        $("#btnSearch").prop('disabled', true);

        self.searchAdventure();
    };

    self.searchAdventure = function()
    {
        var header = self.headers()[self.searchIndex];
        var query = $("#txtSearch").val().toLowerCase();

        $.get("data/" + header.id + ".txt", null, function (data) {
            
            // Search name field
            if (data.name.toLowerCase().indexOf(query) > -1)
            {
                self.searchResults.push({
                    title: data.name,
                    item: 'Title',
                    content: data.name,
                    titleUrl: '#',
                    itemUrl: '#',
                });
            }

            // Search Rooms
            _.each(data.rooms, function(e)
            {
                // Name field
                if (e.name.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Room #' + e.number + '- Name',
                        content: e.name,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/room/" + e.number,
                    });
                }

                // Description field
                if (e.description.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Room #' + e.number + '- Description',
                        content: e.description,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/room/" + e.number,
                    });
                }
            });

            // Search Artifacts
            _.each(data.artifacts, function (e) {
                // Name field
                if (e.name.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Artifact #' + e.number + '- Name',
                        content: e.name,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/artifact/" + e.number,
                    });
                }

                // Description field
                if (e.description.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Artifact #' + e.number + '- Description',
                        content: e.description,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/artifact/" + e.number,
                    });
                }
            });

            // Search Monsters
            _.each(data.monsters, function (e) {
                // Name field
                if (e.name.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Monster #' + e.number + '- Name',
                        content: e.name,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/monster/" + e.number,
                    });
                }

                // Description field
                if (e.description.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Monster #' + e.number + '- Description',
                        content: e.description,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id + "/monster/" + e.number,
                    });
                }
            });

            // Search Effects
            _.each(data.Effects, function (e) {

                // Description field
                if (e.description.toLowerCase().indexOf(query) > -1) {
                    self.searchResults.push({
                        title: data.name,
                        item: 'Effect #' + e.number + '- Description',
                        content: e.description,
                        titleUrl: '#/adv/' + header.id,
                        itemUrl: '#/adv/' + header.id,
                    });
                }
            });

            // Move on to next item
            if (self.searchIndex < self.headers().length - 1)
            {
                self.searchIndex++;
                self.searchAdventure();
            }
            else
            {
                $("#divSearchWait").hide();
                $("#btnSearch").prop('disabled', false);
            }

        }, "json");

    };

    // Artifacts at each of the given locations ({ loc, note }), plus the contents of any containers among them
    self.collectArtifacts = function(sources)
    {
        var adv = self.adventure();
        var artifacts = [];
        var seen = {};

        var addAll = function(loc, note)
        {
            _.each(_.filter(adv.artifacts, function(a) { return a.data[3] == loc; }), function(a)
            {
                if (seen[a.number]) return;
                seen[a.number] = true;

                artifacts.push({ number: a.number, name: a.name, note: note });

                if (a.data[1] == 4) // Container
                {
                    addAll(1000 + a.number, 'inside ' + a.name);
                }
            });
        };

        _.each(sources, function(s) { addAll(s.loc, s.note); });

        return artifacts;
    };

    // Artifacts carried or worn by a monster
    self.monsterArtifactSources = function(m, carriedNote, wornNote)
    {
        return [
            { loc: -1 - m.number, note: carriedNote },
            { loc: -1000 - m.number, note: wornNote }
        ];
    };

    // Monsters and artifacts that start in a room, including artifacts embedded in it,
    // inside containers lying in it, or carried/worn by monsters in it
    self.getRoomContents = function(room)
    {
        var n = room.number;
        var monsters = _.filter(self.adventure().monsters, function(m) { return m.data[4] == n; });
        var sources = [{ loc: n, note: '' }, { loc: 2000 + n, note: 'embedded in the room' }];

        _.each(monsters, function(m)
        {
            sources = sources.concat(self.monsterArtifactSources(m, 'carried by ' + m.name, 'worn by ' + m.name));
        });

        return { monsters: monsters, artifacts: self.collectArtifacts(sources) };
    };

    self.getMonsterArtifacts = function(m)
    {
        return self.collectArtifacts(self.monsterArtifactSources(m, 'carried', 'worn'));
    };

    self.getMonsterWeapon = function(m)
    {
        var w = m.data[7];

        if (w == 0)
        {
            return "0 - Natural weapons";
        }
        else if (w < 0)
        {
            // Unarmed. Between fights the monster readies its best carried weapon or picks up
            // the best one in the room. -(N + 1) means it lost weapon artifact N and will
            // recover it first if it can see it (see GetWep in the Eamon Deluxe source).
            var unarmed = w + " - Unarmed (will ready or pick up a weapon if it can)";
            var lost = _.findWhere(self.adventure().artifacts, { number: -w - 1 });

            if (w == -1 || _.isUndefined(lost))
            {
                return unarmed;
            }

            return w + " - Unarmed, will try to recover its lost weapon: Artifact #<a href='#/adv/" + self.currentId() + "/artifact/" + lost.number + "'>" + lost.number + "</a> (" + _.escape(lost.name) + ")";
        }

        var a = _.findWhere(self.adventure().artifacts, { number: w });

        if (_.isUndefined(a))
        {
            return w + " - undefined Artifact #" + w;
        }

        return "<a href='#/adv/" + self.currentId() + "/artifact/" + a.number + "'>" + a.number + "</a> - " + _.escape(a.name);
    };

    self.getMonsterLocation = function(m)
    {
        var n = m.data[4];

        if (n == 0)
        {
            return "0 - Not placed at start";
        }
        else if (n < 0)
        {
            return String(n);
        }

        var r = _.findWhere(self.adventure().rooms, { number: n });

        if (_.isUndefined(r))
        {
            return n + " - undefined Room #" + n;
        }

        return "<a href='#/adv/" + self.currentId() + "/room/" + r.number + "'>" + r.number + "</a> - " + _.escape(r.name);
    };

    self.getLocation = function(item)
    {
        if (item.data[3] == 0)
        {
            return "Hidden";
        }
        else if (item.data[3] == -1)
        {
            return "Carried by Player";
        }
        else if (item.data[3] == -999)
        {
            return "Worn by Player";
        }
        else if (item.data[3] < -1000)
        {
            var n = Math.abs(item.data[3] + 1000);

            var m = _.findWhere(self.adventure().monsters, { number: n });

            if (_.isUndefined(m))
            {
                return "Worn by undefined Monster #" + n;
            }
            else
            {
                return "Worn by Monster #<a href='#/adv/" + self.currentId() + "/monster/" + m.number + "'>" + m.number + "</a> (" + m.name + ")";
            }
        }
        else if (item.data[3] < -1)
        {
            var n = Math.abs(item.data[3] + 1);

            var m = _.findWhere(self.adventure().monsters, { number: n });

            if (_.isUndefined(m))
            {
                return "Carried by undefined Monster #" + n;
            }
            else
            {
                return "Carried by Monster #<a href='#/adv/" + self.currentId() + "/monster/" + m.number + "'>" + m.number + "</a> (" + m.name + ")";
            }
        }
        else if (item.data[3] > 2000)
        {
            var n = item.data[3] - 2000;

            var r = _.findWhere(self.adventure().rooms, { number: n });

            if (_.isUndefined(r))
            {
                return "Embedded in undefined Room #" + n;
            }
            else
            {
                return "Embedded in Room #<a href='#/adv/" + self.currentId() + "/room/" + r.number + "'>" + r.number + "</a> (" + r.name + ")";
            }
        }
        else if (item.data[3] > 1000)
        {
            var n = item.data[3] - 1000;

            var a = _.findWhere(self.adventure().artifacts, { number: n });

            if (_.isUndefined(a))
            {
                return "Contained in undefined Artifact #" + n;
            }
            else
            {
                return "Contained in Artifact #<a href='#/adv/" + self.currentId() + "/artifact/" + a.number + "'>" + a.number + "</a> (" + a.name + ")";
            }
        }
        else
        {
            var r = _.findWhere(self.adventure().rooms, { number: item.data[3] });

            if (_.isUndefined(r))
            {
                return "In undefined Room #" + item.data[3];
            }
            else
            {
                return "In Room #<a href='#/adv/" + self.currentId() + "/room/" + r.number + "'>" + r.number + "</a> (" + r.name + ")";
            }
        }
    };

    self.init = function()
    {
        self.sammy.run();

        // Enter in the search box runs the search (unless one is already running)
        $("#txtSearch").keydown(function(e)
        {
            if (e.which == 13 && !$("#btnSearch").prop('disabled'))
            {
                self.runSearch();
            }
        });

        // Load the master list
        $.get("data/list.txt", null, function(data)
        {
            self.headers(data);
        }, "json");
    };

    self.init();
}