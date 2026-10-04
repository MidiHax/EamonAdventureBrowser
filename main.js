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
            // Unarmed. The monster readies a carried weapon or picks one up from the room.
            // -(N + 1) means it lost weapon artifact N and will recover it first if it can see it
            // (see GetWep in the Eamon Deluxe source). Combat code -2 monsters never do either.
            if (m.data[5] == -2)
            {
                return w + " - Unarmed (never picks up a weapon - combat code -2)";
            }

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

    // Combat codes, as implemented by the Battle and GetWep routines in the Eamon Deluxe source.
    // An unarmed monster (negative weapon) spends its combat turn picking up or readying a weapon;
    // the codes decide what happens when there is none, and how the attack is described.
    self.getMonsterCombatCode = function(m)
    {
        var labels = {
            '1': 'Same as 0, but combat text says "attacks" instead of the weapon\'s verbs (Eamon Deluxe 5.0 engine only; no effect in older adventures)',
            '0': 'Normal - attacks with its weapon or natural weapons. If unarmed, uses its turn to get a weapon, and does not attack if there is none',
            '-1': 'Same as 0, but if unarmed with no weapon to get, attacks with natural weapons',
            '-2': 'Never attacks or picks up weapons (can still be attacked)'
        };
        var c = m.data[5];

        return c + (labels[c] ? ' - ' + labels[c] : '');
    };

    // 1-3 are fixed. Values over 100 are rolled when the monster is first met: with
    // p = value - 100 + the player's charisma bonus, it is not hostile if p beats a d100 roll,
    // and then friendly if p also beats a d200 roll (see EnemyCheck in the Eamon Deluxe source)
    self.getMonsterPersonality = function(m)
    {
        var labels = { '1': 'Enemy', '2': 'Neutral', '3': 'Friend' };
        var v = m.data[10];

        if (labels[v])
        {
            return v + ' - ' + labels[v];
        }
        else if (v <= 100)
        {
            return String(v);
        }

        var p = v - 100;
        var notHostile = Math.min(p / 100, 1);
        var friend = notHostile * Math.min(p / 200, 1);
        var pct = function(x) { return Math.round(x * 100) + '%'; };

        return v + ' - Random: ' + pct(friend) + ' friend, ' + pct(notHostile - friend) + ' neutral, '
            + pct(1 - notHostile) + ' enemy (before the player\'s charisma bonus)';
    };

    self.linkArtifact = function(n)
    {
        var a = _.findWhere(self.adventure().artifacts, { number: n });

        if (_.isUndefined(a)) return n + " - undefined Artifact #" + n;

        return "<a href='#/adv/" + self.currentId() + "/artifact/" + n + "'>" + n + "</a> - " + _.escape(a.name);
    };

    self.linkMonster = function(n)
    {
        var m = _.findWhere(self.adventure().monsters, { number: n });

        if (_.isUndefined(m)) return n + " - undefined Monster #" + n;

        return "<a href='#/adv/" + self.currentId() + "/monster/" + n + "'>" + n + "</a> - " + _.escape(m.name);
    };

    self.linkRoom = function(n)
    {
        var r = _.findWhere(self.adventure().rooms, { number: n });

        if (_.isUndefined(r)) return n + " - undefined Room #" + n;

        return "<a href='#/adv/" + self.currentId() + "/room/" + n + "'>" + n + "</a> - " + _.escape(r.name);
    };

    // Effect text for effects first .. first + count - 1
    self.effectsText = function(first, count)
    {
        var html = String(first);

        for (var i = 0; i < Math.max(count, 1); i++)
        {
            var e = _.findWhere(self.adventure().effects, { number: first + i });

            html += "<br/><i>" + (e ? "#" + e.number + ": " + _.escape(e.description)
                                     : "Effect #" + (first + i) + " is not in the effect list (probably handled by the adventure's own program)") + "</i>";
        }

        return html;
    };

    // Shared by containers and doors: an open/closed value above 1000 means it is locked
    // shut and must be forced, breaking after (value - 1000) points of damage. 101-999 is an
    // older format that the engine converts by adding 900 (see Attack in MAINPGM.BAS).
    var forcedText = function(v)
    {
        if (v > 1000) return v + " - Closed; must be forced open (breaks after " + (v - 1000) + " points of damage)";
        if (v > 100) return v + " - Closed; must be forced open (older format: breaks after " + (v - 100) + " points of damage)";
        return null;
    };

    var keyText = function(k)
    {
        if (k == 0) return "0 - None";
        if (k == -1) return "-1 - Can't be opened with OPEN (handled by the adventure's own program)";
        if (k < 0) return String(k);
        return self.linkArtifact(k);
    };

    // Type-specific artifact fields (data[4..7] = fields 5-8 in the design manual, section 4.4),
    // with value meanings checked against the Eamon Deluxe 5.0 MAINPGM.BAS
    self.getArtifactFields = function(a)
    {
        var d = a.data;
        var rows = [];
        var add = function(label, html) { rows.push({ label: label, html: html }); };
        var openText = function(v) { return v + (v == 1 ? " - Open" : v == 0 ? " - Closed (must be opened first)" : ""); };

        switch (d[1])
        {
            case 2: // Weapon
            case 3: // Magic weapon
                var weaponTypes = { '1': 'Axe', '2': 'Missile weapon (bow, gun, etc.)', '3': 'Club', '4': 'Spear', '5': 'Sword' };
                add("Weapon Odds:", d[4] + "% (half of this is added to the chance to hit; negative for hard-to-use weapons)");
                add("Weapon Type:", d[5] + (weaponTypes[d[5]] ? " - " + weaponTypes[d[5]] : ""));
                add("Weapon Damage:", d[6] + "d" + d[7] + " (" + d[6] + " to " + (d[6] * d[7]) + " points)");
                break;

            case 4: // Container
                add("Key:", keyText(d[4]));
                add("Open/Closed:", forcedText(d[5]) || openText(d[5]));
                add("Items Inside:", String(d[6]));
                add("Items It Can Hold:", d[7] + (d[7] < 1 ? " - Nothing can be put in it" : ""));
                break;

            case 5: // Lightable
                add("Turns of Light:", d[4] + (d[4] == -1 ? " - Never runs out" : d[4] == 0 ? " - Won't light" : ""));
                break;

            case 6: // Drinkable
            case 9: // Edible
                add("Heal/Damage Points:", d[4] + (d[4] > 0 ? " - Heals " + d[4] : d[4] < 0 ? " - Damages the player by " + (-d[4]) : " - No effect"));
                add(d[1] == 6 ? "Number of Drinks:" : "Number of Bites:", d[5] + (d[1] == 9 ? " (it is gone when all are eaten)" : ""));
                add("Open/Closed:", openText(d[6]));
                break;

            case 7: // Readable
                add("Text (Effects):", self.effectsText(d[4], d[5]));
                add("Open/Closed:", openText(d[6]));
                break;

            case 8: // Door/Gate
                add("Room Beyond:", d[4] > 0 ? self.linkRoom(d[4]) : d[4] == -999 ? "-999 - Exits the adventure" : d[4] + " - Special (handled by the adventure's own program)");
                add("Key:", keyText(d[5]));
                add("Open/Closed:", forcedText(d[6]) || (d[6] + (d[6] == 0 ? " - Open" : d[6] == 1 ? " - Closed" : "")));
                add("Hidden:", d[7] == 1 ? "1 - Yes (\"You can't go that way!\" until it is found)" : d[7] + " - No");
                break;

            case 10: // Bound monster
                add("Bound Monster:", self.linkMonster(d[4]));
                add("Key:", d[5] > 0 ? self.linkArtifact(d[5]) : d[5] + " - None");
                add("Guard:", d[6] > 0 ? self.linkMonster(d[6]) + " (prevents freeing while in the room)" : d[6] + " - None");
                break;

            case 11: // Wearable
                var armorClasses = { '0': 'Clothing (no protection)', '1': 'Shield', '2': 'Leather armor', '4': 'Chain mail', '6': 'Plate mail' };
                var armorTypes = { '0': 'Armor, shields, plain clothes', '1': 'Overclothes (coats, capes, etc.)', '2': 'Shoes, boots', '3': 'Gloves',
                                   '4': 'Hats, headwear', '5': 'Jewelry', '6': 'Undergarments' };
                add("Armor Class:", d[4] + (armorClasses[d[4]] ? " - " + armorClasses[d[4]] : d[4] > 1 ? " - Armor" : ""));
                add("Clothing/Armor Type:", d[5] + (armorTypes[d[5]] ? " - " + armorTypes[d[5]] : "") + " (not used by the game engine)");
                break;

            case 12: // Disguised monster
                add("Disguised Monster:", self.linkMonster(d[4]));
                add("Reveal Text (Effects):", d[5] > 0 ? self.effectsText(d[5], d[6]) : d[5] + " - None");
                break;

            case 13: // Dead body
                add("Takeable:", d[4] == 1 ? "1 - Yes" : d[4] + " - No (\"best if left alone\")");
                break;
        }

        return rows;
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