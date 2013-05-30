/// <reference path="jquery-1.7.2.js" />
/// <reference path="Linq2IndexedDB.js" />

$(function () {
    function initializeViewer() {
        var placeholder = $("#indexedDBViewer");
        var dbName = placeholder.attr("data-dbName");
        createHeader('indexedDBViewerHeader', placeholder);
        var navigation = retrieveOrCreateElement('indexedDBViewerNavigation', 'div', placeholder);
        var menu = retrieveOrCreateElement('indexedDBViewerMenu', 'ul', navigation);
        var menuOverview = expandableListItem('indexedDBViewerMenuOverview', dbName, menu, viewDb, { dbName: dbName, objectStore: null, index: null });

        navigation.addClass('nav');

        linq2indexedDB.prototype.core.db(dbName).then(function () {
            var connection = arguments[0][0];

            linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseBlocked, function () {
                connection.close();
            });

            var menuObjectStores = retrieveOrCreateElement('indexedDBViewerMenuObjectStores', 'ul', menuOverview);

            for (var i = 0; i < connection.objectStoreNames.length; i++) {
                var storeName = connection.objectStoreNames[i];
                var menuObjectStore = expandableListItem('indexedDBViewerMenuObjectStore' + storeName, storeName, menuObjectStores, viewDb, { dbName: dbName, objectStore: storeName, index: null });

                linq2indexedDB.prototype.core.objectStore(linq2indexedDB.prototype.core.transaction(connection, storeName, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY, false), storeName).then(function (args) {
                    var store = args[1];

                    var menuObjectStore = retrieveOrCreateElement('indexedDBViewerMenuObjectStore' + storeName, 'li', menuObjectStores);
                    var menuIndexes = retrieveOrCreateElement('indexedDBViewerMenuObjectStore' + store.name + 'Indexes', 'ul', menuObjectStore);

                    for (var j = 0; j < store.indexNames.length; j++) {
                        var indexName = store.indexNames[i];
                        expandableListItem('indexedDBViewerMenuObjectStore' + store.name + 'Index' + indexName, indexName, menuIndexes, viewDb, { dbName: dbName, objectStore: store.name, index: indexName });
                    }
                });
            }
        }, null, function (args) {
            if (args[1].type == "upgradeneeded") {
                args[0].abort();
            }
        });
    }

    function viewDb(e) {
        var dbName = e.data.dbName;
        var objectStore = e.data.objectStore;
        var index = e.data.index;
        var content = retrieveOrCreateElement('indexedDBViewerContent', 'div', $("#indexedDBViewer"));
        content.empty();

        if (objectStore != null) {
            if (index != null) {
                retrieveOrCreateElement('indexedDBViewerContentGeneral', 'h1', content).text(index);
            }
            else {
                retrieveOrCreateElement('indexedDBViewerContentGeneral', 'h1', content).text(objectStore);
            }
        }

        linq2indexedDB.prototype.core.db(dbName).then(function () {
            var connection = arguments[0][0];

            if (objectStore == null) {
                retrieveOrCreateElement('indexedDBViewerContentGeneral', 'h1', content).text("General");
                retrieveOrCreateElement('indexedDBViewerContentGeneralName', 'span', content).text("Name: " + connection.name);
                content.append("<br/>");
                retrieveOrCreateElement('indexedDBViewerContentGeneralVersion', 'span', content).text("Version: " + connection.version);
                content.append("<br/>");
                content.append("<br/>");

                retrieveOrCreateElement('indexedDBViewerContentObjectStores', 'h1', content).text("Object stores");
                retrieveOrCreateElement('indexedDBViewerContentObjectStoresTable', 'table', content);
                content.append("<br/>");
                content.append("<br/>");

                retrieveOrCreateElement('indexedDBViewerContentIndex', 'h1', content).text("Indexes");
                retrieveOrCreateElement('indexedDBViewerContentIndexTable', 'table', content);
                content.append("<br/>");
            }

            linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseBlocked, function () {
                connection.close();
            });

            for (var i = 0; i < connection.objectStoreNames.length; i++) {
                var storeName = connection.objectStoreNames[i];
                linq2indexedDB.prototype.core.objectStore(linq2indexedDB.prototype.core.transaction(connection, storeName, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY, false), storeName).then(function (args) {
                    var store = args[1];
                    if (objectStore == null) {
                        viewObjectStoreDefinition(store.name, store.keyPath, store.autoIncrement, content);
                    }
                    else {
                        if (index == null && store.name == objectStore) {
                            linq2indexedDB.prototype.core.cursor(store).then(function () {

                            }, function () {
                            }, function (args1) {
                                var keyValue = args1[0];
                                viewObjectStoreData(keyValue.key, keyValue.data, content);
                            });
                        }
                    }
                    for (var j = 0; j < store.indexNames.length; j++) {
                        linq2indexedDB.prototype.core.index(store, store.indexNames[j], false).then(function (args1) {
                            var ix = args1[1];
                            if (objectStore == null) {
                                viewIndexDefinition(ix.name, ix.keyPath, ix.objectStore.name, ix.multiEntry || ix.multiRow, ix.unique, content);
                            }
                            else {
                                if (index != null && ix.name == index) {
                                    linq2indexedDB.prototype.core.cursor(ix).then(function () {
                                        var x = 1;
                                    }, function () {
                                    }, function (args1) {
                                        var keyValue = args1[0];
                                        viewIndexData(args1[1].key, args1[1].primaryKey, keyValue.data, content);
                                    });
                                }
                            }
                        });
                    }
                });
            }

        });
    }

    function viewObjectStoreDefinition(name, keyPath, autoIncrement, parent) {
        var table = retrieveOrCreateElement('indexedDBViewerContentObjectStoresTable', 'table', parent);
        var headerRow = retrieveOrCreateElement('indexedDBViewerContentObjectStoresRowHeader', 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRowHeaderName', 'th', headerRow).text("name");
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRowHeaderKeyPath', 'th', headerRow).text("keyPath");
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRowHeaderAutoIncrement', 'th', headerRow).text("autoIncrement");


        var dataRow = retrieveOrCreateElement('indexedDBViewerContentObjectStoresRow' + name, 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRow' + name + 'Name', 'td', dataRow).text(name);
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRow' + name + 'KeyPath', 'td', dataRow).text(keyPath);
        retrieveOrCreateElement('indexedDBViewerContentObjectStoresRow' + name + 'AutoIncrement', 'td', dataRow).text(autoIncrement);
    }

    function viewIndexDefinition(name, keyPath, objectStore, multiEntry, unique, parent) {
        var table = retrieveOrCreateElement('indexedDBViewerContentIndexTable', 'table', parent);
        var headerRow = retrieveOrCreateElement('indexedDBViewerContentIndexRowHeader', 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderName', 'th', headerRow).text("name");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderKeyPath', 'th', headerRow).text("keyPath");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderObjectStore', 'th', headerRow).text("objectStore");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderMultiEntry', 'th', headerRow).text("multiEntry");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderUnique', 'th', headerRow).text("unique");


        var dataRow = retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name, 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name + 'Name', 'td', dataRow).text(name);
        retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name + 'KeyPath', 'td', dataRow).text(keyPath);
        retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name + 'ObjectStore', 'td', dataRow).text(objectStore);
        retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name + 'MultiEntry', 'td', dataRow).text(multiEntry);
        retrieveOrCreateElement('indexedDBViewerContentIndexRow' + name + 'Unique', 'td', dataRow).text(unique);
    }

    function viewObjectStoreData(key, value, parent) {
        var table = retrieveOrCreateElement('indexedDBViewerContentObjectStoreTable', 'table', parent);
        var headerRow = retrieveOrCreateElement('indexedDBViewerContentObjectStoreRowHeader', 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentObjectStoreRowHeaderKey', 'th', headerRow).text("key");
        retrieveOrCreateElement('indexedDBViewerContentObjectStoreRowHeaderValue', 'th', headerRow).text("value");


        var dataRow = retrieveOrCreateElement('indexedDBViewerContentObjectStoreRow' + key, 'tr', table);
        viewData(key, retrieveOrCreateElement('indexedDBViewerContentObjectStoreRow' + key + 'Key', 'td', dataRow));
        viewData(value, retrieveOrCreateElement('indexedDBViewerContentObjectStoreRow' + key + 'Value', 'td', dataRow));
    }

    function viewIndexData(key, primaryKey, value, parent) {
        var table = retrieveOrCreateElement('indexedDBViewerContentIndexTable', 'table', parent);
        var headerRow = retrieveOrCreateElement('indexedDBViewerContentIndexRowHeader', 'tr', table);
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderKey', 'th', headerRow).text("key");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderPrimaryKey', 'th', headerRow).text("primary key");
        retrieveOrCreateElement('indexedDBViewerContentIndexRowHeaderValue', 'th', headerRow).text("value");


        var dataRow = retrieveOrCreateElement('indexedDBViewerContentIndexRow' + primaryKey, 'tr', table);
        viewData(key, retrieveOrCreateElement('indexedDBViewerContentIndexRow' + primaryKey + 'Key', 'td', dataRow));
        viewData(primaryKey, retrieveOrCreateElement('indexedDBViewerContentIndexRow' + primaryKey + 'PrimaryKey', 'td', dataRow));
        viewData(value, retrieveOrCreateElement('indexedDBViewerContentIndexRow' + primaryKey + 'Value', 'td', dataRow));
    }

    function viewData(value, parent, propName) {
        var text;

        if (propName) {
            text = propName + value;
        }
        else {
            parent = retrieveOrCreateElement(null, 'ul', parent);
            text = value;
        }

        if (typeof (value) === "object" && !(value instanceof Date)) {
            var object = expandableListItem(null, text, parent);
            var properties = retrieveOrCreateElement(null, 'ul', object);
            for (prop in value) {
                viewData(value[prop], properties, prop + ": ");
            }
            object.find('.expendable')[0].click();
        }
        else {
            retrieveOrCreateElement(null, 'li', parent).text(text);
        }
    }

    function expandableListItem(id, text, parent, clickEvent, clickEventData) {
        var li = retrieveOrCreateElement(id, 'li', parent);
        var col = retrieveOrCreateElement(null, 'span', li);
        col.text(' - ');
        col.data('status', 'open');
        col.click(function () {
            if ($(this).data('status') == 'closed') {
                $($($(this)[0].parentElement).find('ul')[0]).show();
                col.text(' - ');
                col.data('status', 'open');
            }
            else if ($(this).data('status') == 'open') {
                $($($(this)[0].parentElement).find('ul')[0]).hide();
                col.text(' + ');
                col.data('status', 'closed');
            }
        });
        col.addClass("clickable");
        col.addClass("expendable");
        
        var item = retrieveOrCreateElement(null, 'span', li);
        item.text(text);

        if (clickEvent) {
            item.click(clickEventData, clickEvent);
            item.addClass("clickable");
        }

        return li;
    }

    function createHeader(id, parent) {
        var header = retrieveOrCreateElement(id, 'div', parent);
        var col = retrieveOrCreateElement(null, 'span', header);
        col.text(' - ');
        col.data('status', 'open');
        col.addClass("clickable");
        col.addClass("expendable");
        col.click(function () {
            if ($(this).data('status') == 'closed') {
                $('#indexedDBViewer').height(170);
                $('#indexedDBViewer').width('100%');
                $('#indexedDBViewerNavigation').show();
                $('#indexedDBViewerContent').show();
                col.text(' - ');
                col.data('status', 'open');
            }
            else if ($(this).data('status') == 'open') {
                $('#indexedDBViewer').height($(this).outerHeight());
                $('#indexedDBViewer').width($(this).outerWidth());
                $('#indexedDBViewerNavigation').hide();
                $('#indexedDBViewerContent').hide();
                col.text(' + ');
                col.data('status', 'closed');
            }
        });
    }

    function retrieveOrCreateElement(id, element, parent) {
        var el;

        if (id && id != null && id != '') {
            if ($('#' + id).length > 0) {
                el = $('#' + id);
            } else {
                el = $('<' + element + ' id="' + id + '"></' + element + '>');
                parent.append(el);
            }
        }
        else {
            el = $('<' + element + '></' + element + '>');
            parent.append(el);
        }

        return el;
    }

    initializeViewer();

    // mousedown, mousemove, mouseup and mouseleave for resizing the placeholder
    $(window).bind('mousedown', function (event) {
        var location = $(window).height() - $("#indexedDBViewer").height();
        if ((location - 2) <= event.pageY && event.pageY <= (location + 5)) {
            $(window).bind('mousemove', resize);
        }
    });

    $(window).bind('mouseup', function () {
        $(window).unbind('mousemove', resize);
    });

    $(window).bind('mouseleave', function () {
        $(window).unbind('mousemove', resize);
    });

    function resize(event) {
        var pageHeight = $(window).height();
        if (pageHeight - event.pageY >= 50) {
            $("#indexedDBViewer").height(pageHeight - event.pageY);
            var height = $("#indexedDBViewer").height() - $("#indexedDBViewerHeader").height();
            $("#indexedDBViewerNavigation").height(height);
            $("#indexedDBViewerContent").height(height);
        }
    }
});