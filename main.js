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

        // Load the master list
        $.get("data/list.txt", null, function(data)
        {
            self.headers(data);
        }, "json");
    };

    self.init();
}