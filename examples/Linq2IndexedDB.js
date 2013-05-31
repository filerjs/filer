/// <reference path="jquery-1.7.2.js" />
/// <reference path="indexeddb.shim.js" />

var linq2indexedDB;
var enableLogging = false;

// Initializes the linq2indexeddb object.
(function () {
    "use strict";

    linq2indexedDB = function (name, configuration, enableDebugging) {
        /// <summary>Creates a new or opens an existing database for the given name</summary>
        /// <param name="name" type="String">The name of the database</param>
        /// <param name="configuration" type="Object">
        ///     [Optional] provide comment
        /// </param>
        /// <returns type="linq2indexedDB" />

        var dbConfig = {
            autoGenerateAllowed: true
        };

        if (name) {
            dbConfig.name = name;
        }

        if (configuration) {
            if (configuration.version) {
                dbConfig.version = configuration.version;
            }
            // From the moment the configuration is provided by the developper, autoGeneration isn't allowed.
            // If this would be allowed, the developper wouldn't be able to determine what to do for which version.
            if (configuration.schema) {
                var appVersion = dbConfig.version || -1;
                for (key in configuration.schema) {
                    if (typeof key === "number") {
                        appVersion = version > key ? version : key;
                    }
                }
                if (version > -1) {
                    dbConfig.autoGenerateAllowed = false;
                    dbConfig.version = appVersion;
                    dbConfig.schema = configuration.schema;
                }
            }
            if (configuration.definition) {
                dbConfig.autoGenerateAllowed = false;
                dbConfig.definition = configuration.definition;
            }
            if (configuration.onupgradeneeded) {
                dbConfig.autoGenerateAllowed = false;
                dbConfig.onupgradeneeded = configuration.onupgradeneeded;
            }
            if (configuration.oninitializeversion) {
                dbConfig.autoGenerateAllowed = false;
                dbConfig.oninitializeversion = configuration.oninitializeversion;
            }
        }

        var returnObject = {
            utilities: linq2indexedDB.prototype.utilities,
            core: linq2indexedDB.prototype.core,
            linq: linq(dbConfig),
            initialize: function () {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Initialize Started");
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    linq2indexedDB.prototype.core.db(dbConfig.name, dbConfig.version).then(function (args) /*db*/ {
                        var db = args[0];

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Close dbconnection");
                        db.close();
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Initialize Succesfull");
                        pw.complete();
                    }, pw.error, function (args) /*txn, e*/ {
                        var txn = args[0];
                        var e = args[1];
                        if (e.type == "upgradeneeded") {
                            upgradeDatabase(dbConfig, e.oldVersion, e.newVersion, txn);
                        }
                    });
                });
            },
            deleteDatabase: function () {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    linq2indexedDB.prototype.core.deleteDb(dbConfig.name).then(function () {
                        pw.complete();
                    }, pw.error);
                });
            }
        };

        enableLogging = enableDebugging;
        if (enableDebugging) {
            returnObject.viewer = viewer(dbConfig);
            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.warning, "Debugging enabled: be carefull when using in production enviroment. Complex objects get written to  the log and may cause memory leaks.")

        } else {
            returnObject.viewer = null;
        }


        return returnObject;
    };

    function linq(dbConfig) {

        var queryBuilderObj = function (objectStoreName) {
            this.from = objectStoreName;
            this.where = [];
            this.select = [];
            this.sortClauses = [];
            this.get = [];
            this.insert = [];
            this.merge = [];
            this.update = [];
            this.remove = [];
            this.clear = false;
        };

        queryBuilderObj.prototype = {
            executeQuery: function () {
                executeQuery(this);
            }
        };

        function from(queryBuilder, objectStoreName) {
            queryBuilder.from = objectStoreName;
            return {
                where: function (filter) {
                    /// <summary>Filters the selected data.</summary>
                    /// <param name="filter">
                    /// The filter argument can be a string (In this case the string represents the property name you want to filter on) or a function.
                    /// (In this case the function will be used to filter the data. This callback function is called with 1 parameter: data
                    /// ,this argument holds the data that has to be validated. The return type of the function must be a boolean.)
                    ///</param>
                    return where(queryBuilder, filter, true, false);
                },
                orderBy: function (propertyName) {
                    /// <summary>Sorts the selected data ascending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, false);
                },
                orderByDesc: function (propertyName) {
                    /// <summary>Sorts the selected data descending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, true);
                },
                select: function (propertyNames) {
                    /// <summary>Selects the data.</summary>
                    /// <param name="propertyNames" type="Array">A list of the names of the properties you want to select.</param>
                    /// <returns type="Array">A list with the selected objects.</returns>
                    return select(queryBuilder, propertyNames);
                },
                insert: function (data, key) {
                    /// <summary>inserts data.</summary>
                    /// <param name="data" type="Object">The object you want to insert.</param>
                    /// <param name="key" type="Object">
                    ///     [Optional] The key of the data you want to insert.
                    /// </param>
                    /// <returns type="Object">The object that was inserted.</returns>
                    return insert(queryBuilder, data, key);
                },
                update: function (data, key) {
                    /// <summary>updates data.</summary>
                    /// <param name="data" type="Object">The object you want to update.</param>
                    /// <param name="key" type="Object">
                    ///     [Optional] The key of the data you want to update.
                    /// </param>
                    /// <returns type="Object">The object that was updated.</returns>
                    return update(queryBuilder, data, key);
                },
                merge: function (data, key) {
                    /// <summary>merges data.</summary>
                    /// <param name="data" type="Object">The data you want to merge.</param>
                    /// <param name="key" type="Object">
                    ///     The key of the data you want to update.
                    /// </param>
                    /// <returns type="Object">The object that was updated.</returns>
                    return merge(queryBuilder, data, key);
                },
                remove: function (key) {
                    /// <summary>Removes data from the objectstore by his key.</summary>
                    /// <param name="key" type="Object">The key of the object you want to remove.</param>
                    return remove(queryBuilder, key);
                },
                clear: function () {
                    /// <summary>Removes all data from the objectstore.</summary>
                    return clear(queryBuilder);
                },
                get: function (key) {
                    /// <summary>Gets an object by his key.</summary>
                    /// <param name="key" type="Object">The key of the object you want to retrieve.</param>
                    /// <returns type="Object">The object that has the provided key.</returns>
                    return get(queryBuilder, key);
                }
            };
        }

        function where(queryBuilder, filter, isAndClause, isOrClause, isNotClause) {
            var whereClauses = {};
            var filterMetaData;

            if (isNotClause === "undefined") {
                whereClauses.not = function () {
                    return where(queryBuilder, filter, isAndClause, isOrClause, true);
                };
            }

            if (typeof filter === "function") {
                filterMetaData = {
                    propertyName: filter,
                    isOrClause: isOrClause,
                    isAndClause: isAndClause,
                    isNotClause: (isNotClause === "undefined" ? false : isNotClause),
                    filter: linq2indexedDB.prototype.linq.createFilter("anonymous" + queryBuilder.where.length, filter, null)
                };
                return whereClause(queryBuilder, filterMetaData);
            } else if (typeof filter === "string") {
                    // Builds up the where filter methodes
                for (var filterName in linq2indexedDB.prototype.linq.filters) {
                    filterMetaData = {
                        propertyName: filter,
                        isOrClause: isOrClause,
                        isAndClause: isAndClause,
                        isNotClause: (typeof isNotClause === "undefined" ? false : isNotClause),
                        filter: linq2indexedDB.prototype.linq.filters[filterName]
                    };
                    if (typeof linq2indexedDB.prototype.linq.filters[filterName].filter !== "function") {
                        throw "Linq2IndexedDB: a filter methods needs to be provided for the filter '" + filterName + "'";
                    }
                    if (typeof linq2indexedDB.prototype.linq.filters[filterName].name === "undefined") {
                        throw "Linq2IndexedDB: a filter name needs to be provided for the filter '" + filterName + "'";
                    }

                    whereClauses[linq2indexedDB.prototype.linq.filters[filterName].name] = linq2indexedDB.prototype.linq.filters[filterName].filter(whereClause, queryBuilder, filterMetaData);
                }
            }
            return whereClauses;
        }

        function whereClause(queryBuilder, filterMetaData) {
            queryBuilder.where.push(filterMetaData);
            return {
                and: function (filter) {
                    /// <summary>Adds an extra filter.</summary>
                    /// <param name="filter">
                    /// The filter argument can be a string (In this case the string represents the property name you want to filter on) or a function.
                    /// (In this case the function will be used to filter the data. This callback function is called with 1 parameter: data
                    /// ,this argument holds the data that has to be validated. The return type of the function must be a boolean.)
                    ///</param>
                    return where(queryBuilder, filter, true, false);
                },
                or: function (filter) {
                    /// <summary>Adds an extra filter.</summary>
                    /// <param name="filter">
                    /// The filter argument can be a string (In this case the string represents the property name you want to filter on) or a function.
                    /// (In this case the function will be used to filter the data. This callback function is called with 1 parameter: data
                    /// ,this argument holds the data that has to be validated. The return type of the function must be a boolean.)
                    ///</param>
                    return where(queryBuilder, filter, false, true);
                },
                orderBy: function (propertyName) {
                    /// <summary>Sorts the selected data ascending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, false);
                },
                orderByDesc: function (propertyName) {
                    /// <summary>Sorts the selected data descending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, true);
                },
                select: function (propertyNames) {
                    /// <summary>Selects the data.</summary>
                    /// <param name="propertyNames" type="Array">A list of the names of the properties you want to select.</param>
                    return select(queryBuilder, propertyNames);
                },
                remove: function () {
                    return remove(queryBuilder);
                },
                merge: function (data) {
                    return merge(queryBuilder, data);
                }
            };
        }

        function orderBy(queryBuilder, propName, descending) {
            queryBuilder.sortClauses.push({ propertyName: propName, descending: descending });
            return {
                orderBy: function (propertyName) {
                    /// <summary>Sorts the selected data ascending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, false);
                },
                orderByDesc: function (propertyName) {
                    /// <summary>Sorts the selected data descending.</summary>
                    /// <param name="propertyName" type="String">The name of the property you want to sort on.</param>
                    return orderBy(queryBuilder, propertyName, true);
                },
                select: function (propertyNames) {
                    /// <summary>Selects the data.</summary>
                    /// <param name="propertyNames" type="Array">A list of the names of the properties you want to select.</param>
                    return select(queryBuilder, propertyNames);
                }
            };
        }

        function select(queryBuilder, propertyNames) {
            if (propertyNames) {
                if (!linq2indexedDB.prototype.utilities.isArray(propertyNames)) {
                    propertyNames = [propertyNames];
                }

                for (var i = 0; i < propertyNames.length; i++) {
                    queryBuilder.select.push(propertyNames[i]);
                }
            }
            return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                var returnData = [];
                executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, executeWhere).then(function () {
                    pw.complete(this, returnData);
                },pw.error, function(args) {
                    var obj = selectData(args[0].data, queryBuilder.select);
                    returnData.push(obj);
                    pw.progress(this, obj /*[obj]*/);
                });
            });
        }

        function insert(queryBuilder, data, key) {
            queryBuilder.insert.push({ data: data, key: key });
            return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, pw, transaction) {
                var objectStorePromis = linq2indexedDB.prototype.core.objectStore(transaction, qb.from);
                if (linq2indexedDB.prototype.utilities.isArray(qb.insert[0].data) && !qb.insert[0].key) {
                    var returnData = [];
                    for (var i = 0; i < qb.insert[0].data.length; i++) {
                        linq2indexedDB.prototype.core.insert(objectStorePromis, qb.insert[0].data[i]).then(function (args /*storedData, storedkey*/) {
                            pw.progress(this, {object: args[0], key: args[1]}/*[storedData, storedkey]*/);
                            returnData.push({ object: args[0], key: args[1] });
                            if (returnData.length == qb.insert[0].data.length) {
                                pw.complete(this, returnData);
                            }
                        }, pw.error);
                    }
                }
                else {
                    linq2indexedDB.prototype.core.insert(objectStorePromis, qb.insert[0].data, qb.insert[0].key).then(function(args /*storedData, storedkey*/) {
                        pw.complete(this, {object: args[0], key: args[1]} /*[storedData, storedkey]*/);
                    }, pw.error);
                }
            });
        }

        function update(queryBuilder, data, key) {
            queryBuilder.update.push({ data: data, key: key });
            return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, pw, transaction) {
                linq2indexedDB.prototype.core.update(linq2indexedDB.prototype.core.objectStore(transaction, qb.from), qb.update[0].data, qb.update[0].key).then(function (args /*storedData, storedkey*/) {
                    pw.complete(this, {object: args[0], key: args[1]} /*[storedData, storedkey]*/);
                }, pw.error);
            });
        }

        function merge(queryBuilder, data, key) {
            queryBuilder.merge.push({ data: data, key: key });
            if (key) {
                return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function(qb, pw, transaction) {
                    var objectStore = linq2indexedDB.prototype.core.objectStore(transaction, qb.from);
                    var obj = null;
                    linq2indexedDB.prototype.core.cursor(objectStore, IDBKeyRange.only(qb.merge[0].key)).then(function() {
                    }, pw.error, function(args /*data*/) {
                        obj = args[0].data;
                        for (var prop in qb.merge[0].data) {
                            obj[prop] = qb.merge[0].data[prop];
                        }

                        args[0].update(obj);
                        pw.complete(this, obj);
                    }, pw.error);
                });
            }
            else {
                var returnData = [];
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, executeWhere).then(function (args) {
                        if (returnData.length > 0) {
                            pw.complete(this, returnData);
                        }
                        else {
                            executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, promise, transaction) {
                                linq2indexedDB.prototype.core.objectStore(transaction, qb.from).then(function (objectStoreArgs) {
                                    for (var i = 0; i < args.length; i++) {
                                        var obj = args[i];
                                        for (var prop in queryBuilder.merge[0].data) {
                                            obj[prop] = queryBuilder.merge[0].data[prop];
                                        }
                                        linq2indexedDB.prototype.core.update(objectStoreArgs[1], obj).then(function (args1 /*data*/) {
                                            pw.progress(this, args1[0] /*[data]*/);
                                            returnData.push(args1[0]);
                                            if (returnData.length == args.length) {
                                                promise.complete(this, returnData);
                                            }
                                        }, promise.error);
                                    }
                                }, promise.error);
                            }).then(pw.complete, pw.error, pw.progress);
                        }
                    }, null, function (args) {
                        if (args[0].update) {
                            var obj = args[0].data;
                            for (var prop in queryBuilder.merge[0].data) {
                                obj[prop] = queryBuilder.merge[0].data[prop];
                            }

                            args[0].update(obj);
                            pw.progress(this, obj);
                            returnData.push(obj);
                        }
                    });
                });
            }
        }

        function remove(queryBuilder, key) {
            if (key) {
                queryBuilder.remove.push({ key: key });
                return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, pw, transaction) {
                    linq2indexedDB.prototype.core.remove(linq2indexedDB.prototype.core.objectStore(transaction, qb.from), qb.remove[0].key).then(function () {
                        pw.complete(this, queryBuilder.remove[0].key /*[queryBuilder.remove[0].key]*/);
                    }, pw.error);
                });
            }
            else {
                var cursorDelete = false;
                return linq2indexedDB.prototype.utilities.promiseWrapper(function(pw) {
                    executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, executeWhere).then(function (data) {
                        if (cursorDelete) {
                            pw.complete(this);
                        }
                        else {
                            executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, promise, transaction) {
                                linq2indexedDB.prototype.core.objectStore(transaction, qb.from).then(function (objectStoreArgs) {
                                    var itemsDeleted = 0;
                                    for (var i = 0; i < data.length; i++) {
                                        linq2indexedDB.prototype.core.remove(objectStoreArgs[1], linq2indexedDB.prototype.utilities.getPropertyValue(data[i], objectStoreArgs[1].keyPath)).then(function(args1 /*data*/) {
                                            pw.progress(this, args1[0] /*[data]*/);
                                            if (++itemsDeleted == data.length) {
                                                promise.complete(this);
                                            }
                                        }, promise.error);
                                    }
                                }, promise.error);
                            }).then(pw.complete, pw.error, pw.progress);
                        }
                    }, null, function(args) {
                        if (args[0].remove) {
                            args[0].remove();
                            pw.progress(this);
                            cursorDelete = true;
                        }
                    });
                });
            }
        }

        function clear(queryBuilder) {
            queryBuilder.clear = true;
            return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE, function (qb, pw, transaction) {
                linq2indexedDB.prototype.core.clear(linq2indexedDB.prototype.core.objectStore(transaction, qb.from)).then(function () {
                    pw.complete(this);
                }, pw.error);
            });
        }

        function get(queryBuilder, key) {
            queryBuilder.get.push({ key: key });
            return executeQuery(queryBuilder, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY, function (qb, pw, transaction) {
                linq2indexedDB.prototype.core.get(linq2indexedDB.prototype.core.objectStore(transaction, qb.from), qb.get[0].key).then(function (args /*data*/) {
                    pw.complete(this, args[0] /*[data]*/);
                }, pw.error);
            });
        }

        function executeQuery(queryBuilder, transactionType, callBack) {
            return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                // Create DB connection
                linq2indexedDB.prototype.core.db(dbConfig.name, dbConfig.version).then(function (args /* [db, event] */) {
                    // Opening a transaction
                    linq2indexedDB.prototype.core.transaction(args[0], queryBuilder.from, transactionType, dbConfig.autoGenerateAllowed).then(function (transactionArgs /* [transaction] */) {
                        var txn = transactionArgs[0];
                        txn.db.close();
                        // call complete if it isn't called already
                        //pw.complete();
                    },
                    pw.error,
                    function (transactionArgs /* [transaction] */) {
                        callBack(queryBuilder, pw, transactionArgs[0]);
                    });
                }
                , pw.error
                , function (args /*txn, e*/) {
                    var txn = args[0];
                    var e = args[1];

                    // Upgrading the database to the correct version
                    if (e.type == "upgradeneeded") {
                        upgradeDatabase(dbConfig, e.oldVersion, e.newVersion, txn);
                    }
                });
            });
        }

        function executeWhere(queryBuilder, pw, transaction) {
            linq2indexedDB.prototype.core.objectStore(transaction, queryBuilder.from).then(function (objArgs) {
                try {
                    var objectStore = objArgs[1];
                    var whereClauses = queryBuilder.where || [];
                    var returnData = [];
                    var cursorPromise = determineCursor(objectStore, whereClauses);

                    cursorPromise.then(
                        function (args1 /*data*/) {
                            var data = args1[0];

                            linq2indexedDB.prototype.utilities.linq2indexedDBWorker(data, whereClauses, queryBuilder.sortClauses).then(function (d) {
                                // No need to notify again if it allready happend in the onProgress method of the cursor.
                                if (returnData.length == 0) {
                                    for (var j = 0; j < d.length; j++) {
                                        pw.progress(this, [d[j]] /*[obj]*/);
                                    }
                                }
                                pw.complete(this, d /*[returnData]*/);
                            });
                        },
                        pw.error,
                        function (args1 /*data*/) {

                            // When there are no more where clauses to fulfill and the collection doesn't need to be sorted, the data can be returned.
                            // In the other case let the complete handle it.
                            if (whereClauses.length == 0 && queryBuilder.sortClauses.length == 0) {
                                returnData.push({ data: args1[0].data, key: args1[0].key });
                                pw.progress(this, args1 /*[obj]*/);
                            }
                        }
                    );
                } catch (ex) {
                    // Handle errors like an invalid keyRange.
                    linq2indexedDB.prototype.core.abortTransaction(args[0]);
                    pw.error(this, [ex.message, ex]);
                }
            }, pw.error);
        }

        function determineCursor(objectStore, whereClauses) {
            var cursorPromise;

            // Checks if an indexeddb filter can be used
            if (whereClauses.length > 0
                && !whereClauses[0].isNotClause
                && whereClauses[0].filter.indexeddbFilter
                && (whereClauses.length == 1 || (whereClauses.length > 1 && !whereClauses[1].isOrClause))) {
                var source = objectStore;
                var indexPossible = dbConfig.autoGenerateAllowed || objectStore.indexNames.contains(whereClauses[0].propertyName + linq2indexedDB.prototype.core.indexSuffix);
                // Checks if we can use an index
                if (whereClauses[0].propertyName != objectStore.keyPath && indexPossible) {
                    source = linq2indexedDB.prototype.core.index(objectStore, whereClauses[0].propertyName, dbConfig.autoGenerateAllowed);
                }
                // Checks if we can use indexeddb filter
                if (whereClauses[0].propertyName == objectStore.keyPath
                    || indexPossible) {
                    // Gets the where clause + removes it from the collection
                    var clause = whereClauses.shift();
                    switch (clause.filter) {
                        case linq2indexedDB.prototype.linq.filters.equals:
                            cursorPromise = linq2indexedDB.prototype.core.cursor(source, IDBKeyRange.only(clause.value));
                            break;
                        case linq2indexedDB.prototype.linq.filters.between:
                            cursorPromise = linq2indexedDB.prototype.core.cursor(source, IDBKeyRange.bound(clause.minValue, clause.maxValue, clause.minValueIncluded, clause.maxValueIncluded));
                            break;
                        case linq2indexedDB.prototype.linq.filters.greaterThan:
                            cursorPromise = linq2indexedDB.prototype.core.cursor(source, IDBKeyRange.lowerBound(clause.value, clause.valueIncluded));
                            break;
                        case linq2indexedDB.prototype.linq.filters.smallerThan:
                            cursorPromise = linq2indexedDB.prototype.core.cursor(source, IDBKeyRange.upperBound(clause.value, clause.valueIncluded));
                            break;
                        default:
                            cursorPromise = linq2indexedDB.prototype.core.cursor(source);
                            break;
                    }
                } else {
                    // Get everything if the index can't be used
                    cursorPromise = linq2indexedDB.prototype.core.cursor(source);
                }
            } else {
                // Get's everything, manually filter data
                cursorPromise = linq2indexedDB.prototype.core.cursor(objectStore);
            }
            return cursorPromise;
        }

        function selectData(data, propertyNames) {
            if (propertyNames && propertyNames.length > 0) {
                if (!linq2indexedDB.prototype.utilities.isArray(propertyNames)) {
                    propertyNames = [propertyNames];
                }

                var obj = new Object();
                for (var i = 0; i < propertyNames.length; i++) {
                    linq2indexedDB.prototype.utilities.setPropertyValue(obj, propertyNames[i], linq2indexedDB.prototype.utilities.getPropertyValue(data, propertyNames[i]));
                }
                return obj;
            }
            return data;
        }

        return {
            from: function (objectStoreName) {
                return from(new queryBuilderObj(objectStoreName), objectStoreName);
            }
        };
    }

    function viewer(dbConfig) {
        var dbView = {};
        var refresh = true;

        function refreshInternal() {
            if (refresh) {
                refresh = false;
                getDbInformation(dbView, dbConfig);
            }
        }

        dbView.Configuration = {
            name: dbConfig.name,
            version: dbConfig.version,
            autoGenerateAllowed: dbConfig.autoGenerateAllowed,
            schema: dbConfig.schema,
            definition: dbConfig.definition,
            onupgradeneeded: dbConfig.onupgradeneeded,
            oninitializeversion: dbConfig.oninitializeversion
        };

        dbView.refresh = function () {
            refresh = true;
            refreshInternal();
        };

        linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseUpgrade, function () {
            refresh = true;
        });
        linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseOpened, function () {
            refreshInternal();
        });
        linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseRemoved, function () {
            dbView.name = null;
            dbView.version = null;
            dbView.ObjectStores = [];
        });
        linq2indexedDB.prototype.core.dbDataChanged.addListener([linq2indexedDB.prototype.core.dataEvents.dataInserted, linq2indexedDB.prototype.core.dataEvents.dataRemoved, linq2indexedDB.prototype.core.dataEvents.dataUpdated, linq2indexedDB.prototype.core.dataEvents.objectStoreCleared], function () {
            dbView.refresh();
        });

        return dbView;
    }

    function getDbInformation(dbView, dbConfig) {
        linq2indexedDB.prototype.core.db(dbConfig.name).then(function () {
            var connection = arguments[0][0];
            dbView.name = connection.name;
            dbView.version = connection.version;
            dbView.ObjectStores = [];

            linq2indexedDB.prototype.core.dbStructureChanged.addListener(linq2indexedDB.prototype.core.databaseEvents.databaseBlocked, function () {
                connection.close();
            });

            var objectStoreNames = [];
            for (var k = 0; k < connection.objectStoreNames.length; k++) {
                objectStoreNames.push(connection.objectStoreNames[k]);
            }

            if (objectStoreNames.length > 0) {
                linq2indexedDB.prototype.core.transaction(connection, objectStoreNames, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY, false).then(null, null, function () {
                    var transaction = arguments[0][0];

                    for (var i = 0; i < connection.objectStoreNames.length; i++) {
                        linq2indexedDB.prototype.core.objectStore(transaction, connection.objectStoreNames[i]).then(function () {
                            var objectStore = arguments[0][1];
                            var indexes = [];
                            var objectStoreData = [];

                            for (var j = 0; j < objectStore.indexNames.length; j++) {
                                linq2indexedDB.prototype.core.index(objectStore, objectStore.indexNames[j], false).then(function () {
                                    var index = arguments[0][1];
                                    var indexData = [];

                                    linq2indexedDB.prototype.core.cursor(index).then(null, null, function () {
                                        var data = arguments[0][0];
                                        var key = arguments[0][1].primaryKey;
                                        indexData.push({ key: key, data: data });
                                    });

                                    indexes.push({
                                        name: index.name,
                                        keyPath: index.keyPath,
                                        multiEntry: index.multiEntry,
                                        data: indexData
                                    });
                                });
                            }

                            linq2indexedDB.prototype.core.cursor(objectStore).then(null, null, function () {
                                var data = arguments[0][0];
                                var key = arguments[0][1].primaryKey;
                                objectStoreData.push({ key: key, data: data });
                            });

                            dbView.ObjectStores.push({
                                name: objectStore.name,
                                keyPath: objectStore.keyPath,
                                autoIncrement: objectStore.autoIncrement,
                                indexes: indexes,
                                data: objectStoreData
                            });
                        });
                    }
                });
            }
        }, null, function (args) {
            if (args[1].type == "upgradeneeded") {
                args[0].abort();
            }
        });
    }

    function getVersionDefinition(version, definitions) {
        var result = null;
        for (var i = 0; i < definitions.length; i++) {
            if (parseInt(definitions[i].version) == parseInt(version)) {
                result = definitions[i];
            }
        }
        return result;
    }

    function initializeVersion(txn, definition) {
        try {
            if (definition.objectStores) {
                for (var i = 0; i < definition.objectStores.length; i++) {
                    var objectStoreDefinition = definition.objectStores[i];
                    if (objectStoreDefinition.remove) {
                        linq2indexedDB.prototype.core.deleteObjectStore(txn, objectStoreDefinition.name);
                    } else {
                        linq2indexedDB.prototype.core.createObjectStore(txn, objectStoreDefinition.name, objectStoreDefinition.objectStoreOptions);
                    }
                }
            }

            if (definition.indexes) {
                for (var j = 0; j < definition.indexes.length; j++) {
                    var indexDefinition = definition.indexes[j];
                    if (indexDefinition.remove) {
                        linq2indexedDB.prototype.core.deleteIndex(linq2indexedDB.prototype.core.objectStore(txn, indexDefinition.objectStoreName), indexDefinition.propertyName);
                    } else {
                        linq2indexedDB.prototype.core.createIndex(linq2indexedDB.prototype.core.objectStore(txn, indexDefinition.objectStoreName), indexDefinition.propertyName, indexDefinition.indexOptions);
                    }
                }
            }

            if (definition.defaultData) {
                for (var k = 0; k < definition.defaultData.length; k++) {
                    var defaultDataDefinition = definition.defaultData[k];
                    if (defaultDataDefinition.remove) {
                        linq2indexedDB.prototype.core.remove(linq2indexedDB.prototype.core.objectStore(txn, defaultDataDefinition.objectStoreName), defaultDataDefinition.key);
                    } else {
                        linq2indexedDB.prototype.core.insert(linq2indexedDB.prototype.core.objectStore(txn, defaultDataDefinition.objectStoreName), defaultDataDefinition.data, defaultDataDefinition.key);
                    }
                }
            }
        } catch (ex) {
            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.exception, "initialize version exception: ", ex);
            linq2indexedDB.prototype.core.abortTransaction(txn);
        }
    }

    function upgradeDatabase(dbConfig, oldVersion, newVersion, txn) {
        if (dbConfig.onupgradeneeded) {
            dbConfig.onupgradeneeded(txn, oldVersion, newVersion);
        }
        if (dbConfig.oninitializeversion || dbConfig.schema || dbConfig.definition) {
            for (var version = oldVersion + 1; version <= newVersion; version++) {
                if (dbConfig.schema) {
                    dbConfig.schema[version](txn);
                }
                if (dbConfig.definition) {
                    var versionDefinition = getVersionDefinition(version, dbConfig.definition);
                    if (versionDefinition) {
                        initializeVersion(txn, versionDefinition);
                    }
                } else if (dbConfig.oninitializeversion) {
                    dbConfig.oninitializeversion(txn, version);
                }
            }
        }
    }

})();

// Namespace linq2indexedDB.prototype.linq
(function () {
    linq2indexedDB.prototype.linq = {
        addFilter: function (name, isValid, filterCallback) {
            if (typeof linq2indexedDB.prototype.linq.filters[name] !== 'undefined') {
                throw "linq2IndexedDB: A filter with the name '" + name + "' already exists.";
            }

            linq2indexedDB.prototype.linq.filters[name] = linq2indexedDB.prototype.linq.createFilter(name, isValid, filterCallback);
        },
        createFilter: function (name, isValid, filterCallback) {
            if (typeof name === 'undefined') {
                throw "linq2IndexedDB: No name argument provided to the addFilter method.";
            }
            if (typeof name !== 'string') {
                throw "linq2IndexedDB: The name argument provided to the addFilterObject method must be a string.";
            }
            if (typeof isValid === 'undefined') {
                throw "linq2IndexedDB: No isValid argument provided to the addFilter method.";
            }
            if (typeof isValid !== 'function') {
                throw "linq2IndexedDB: The isValid argument provided to the addFilterObject method must be a function.";
            }
            if (typeof filterCallback === 'undefined') {
                throw "linq2IndexedDB: No filterCallback argument provided to the addFilter method.";
            }
            //if (typeof filterCallback !== 'function') {
            //    throw "linq2IndexedDB: The filterCallback argument provided to the addFilterObject method must be a function.";
            //}

            return {
                name: name,
                indexeddbFilter: false,
                sortOrder: 99,
                isValid: isValid,
                filter: filterCallback
            };
        },
        filters: {
            equals: {
                name: "equals",
                indexeddbFilter: true,
                sortOrder: 0,
                isValid: function (data, filter) {
                    return linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName) == filter.value;
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (value) {
                        if (typeof (value) === "undefined") {
                            throw "linq2indexedDB: value needs to be provided to the equal clause";
                        }
                        filterMetaData.value = value;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            between: {
                name: "between",
                sortOrder: 1,
                indexeddbFilter: true,
                isValid: function (data, filter) {
                    var value = linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName);
                    return (value > filter.minValue || (filter.minValueIncluded && value == filter.minValue))
                        && (value < filter.maxValue || (filter.maxValueIncluded && value == filter.maxValue));
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (minValue, maxValue, minValueIncluded, maxValueIncluded) {
                        var isMinValueIncluded = typeof (minValueIncluded) === undefined ? false : minValueIncluded;
                        var isMasValueIncluded = typeof (maxValueIncluded) === undefined ? false : maxValueIncluded;
                        if (typeof (minValue) === "undefined") {
                            throw "linq2indexedDB: minValue needs to be provided to the between clause";
                        }
                        if (typeof (maxValue) === "undefined") {
                            throw "linq2indexedDB: maxValue needs to be provided to the between clause";
                        }

                        filterMetaData.minValue = minValue;
                        filterMetaData.maxValue = maxValue;
                        filterMetaData.minValueIncluded = isMinValueIncluded;
                        filterMetaData.maxValueIncluded = isMasValueIncluded;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            greaterThan: {
                name: "greaterThan",
                sortOrder: 2,
                indexeddbFilter: true,
                isValid: function (data, filter) {
                    var value = linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName);
                    return value > filter.value || (filter.valueIncluded && value == filter.value);
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (value, valueIncluded) {
                        if (typeof (value) === "undefined") {
                            throw "linq2indexedDB: value needs to be provided to the greatherThan clause";
                        }
                        var isValueIncluded = typeof (valueIncluded) === undefined ? false : valueIncluded;

                        filterMetaData.value = value;
                        filterMetaData.valueIncluded = isValueIncluded;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            smallerThan: {
                name: "smallerThan",
                sortOrder: 2,
                indexeddbFilter: true,
                isValid: function (data, filter) {
                    var value = linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName);
                    return value < filter.value || (filter.valueIncluded && value == filter.value);
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (value, valueIncluded) {
                        if (typeof (value) === "undefined") {
                            throw "linq2indexedDB: value needs to be provided to the smallerThan clause";
                        }
                        var isValueIncluded = typeof (valueIncluded) === undefined ? false : valueIncluded;

                        filterMetaData.value = value;
                        filterMetaData.valueIncluded = isValueIncluded;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            inArray: {
                name: "inArray",
                sortOrder: 3,
                indexeddbFilter: false,
                isValid: function (data, filter) {
                    var value = linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName);
                    if (value) {
                        return filter.value.indexOf(value) >= 0;
                    }
                    else {
                        return false;
                    }
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (array) {
                        if (typeof (array) === "undefined" || typeof array !== "Array") {
                            throw "linq2indexedDB: array needs to be provided to the inArray clause";
                        }

                        filterMetaData.value = array;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            like: {
                name: "like",
                sortOrder: 4,
                indexeddbFilter: false,
                isValid: function (data, filter) {
                    var value = linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName);
                    if (value) {
                        return value.indexOf(filter.value) >= 0;
                    }
                    else {
                        return false;
                    }
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function (value) {
                        if (typeof (value) === "undefined") {
                            throw "linq2indexedDB: value needs to be provided to the like clause";
                        }

                        filterMetaData.value = value;

                        return callback(queryBuilder, filterMetaData);
                    };
                }
            },
            isUndefined: {
                name: "isUndefined",
                sortOrder: 5,
                indexeddbFilter: false,
                isValid: function (data, filter) {
                    return linq2indexedDB.prototype.utilities.getPropertyValue(data, filter.propertyName) === undefined;
                },
                filter: function (callback, queryBuilder, filterMetaData) {
                    /// <summary>Creates a function to retrieve values for the filter and adds the filter to the querybuilder.</summary>
                    /// <param name="callback" type="function">
                    ///     Callback method so the query expression can be builded.
                    /// </param>
                    /// <param name="queryBuilder" type="Object">
                    ///     The objects that builds up the query for the user.
                    /// </param>
                    /// <param name="filterMetaData" type="string">
                    ///     The metadata for the filter.
                    /// </param>
                    /// <returns type="function">
                    ///     returns a function to retrieve the necessary values for the filter
                    /// </returns>
                    return function () {
                        return callback(queryBuilder, filterMetaData);
                    };
                }
            }
        }
    };
})();

// Namespace linq2indexedDB.prototype.utitlities
(function (isMetroApp) {
    "use strict";

    var utilities = {
        linq2indexedDBWorkerFileLocation: "/Scripts/Linq2IndexedDB.js",
        linq2indexedDBWorker: function (data, filters, sortClauses) {
            return utilities.promiseWrapper(function (pw) {
                if (!!window.Worker) {
                    var worker = new Worker(utilities.linq2indexedDBWorkerFileLocation);
                    worker.onmessage = function (event) {
                        pw.complete(this, event.data);
                        worker.terminate();
                    };
                    worker.onerror = pw.error;

                    var filtersString = JSON.stringify(filters, linq2indexedDB.prototype.utilities.serialize);

                    worker.postMessage({ data: data, filters: filtersString, sortClauses: sortClauses });
                } else {
                    // Fallback when there are no webworkers present. Beware, this runs on the UI thread and can block the UI
                    pw.complete(this, utilities.filterSort(data, filters, sortClauses));
                }
            });
        },
        isArray: function (array) {
            if (array instanceof Array) {
                return true;
            } else {
                return false;
            }
        },
        JSONComparer: function (propertyName, descending) {
            return {
                sort: function (valueX, valueY) {
                    if (descending) {
                        return ((valueX[propertyName] == valueY[propertyName]) ? 0 : ((valueX[propertyName] > valueY[propertyName]) ? -1 : 1));
                    } else {
                        return ((valueX[propertyName] == valueY[propertyName]) ? 0 : ((valueX[propertyName] > valueY[propertyName]) ? 1 : -1));
                    }
                }
            };
        },
        promiseWrapper: function (promise, arg1, arg2, arg3, arg4, arg5) {
            if (isMetroApp) {
                return new WinJS.Promise(function (completed, error, progress) {
                    promise({
                        complete: function (context, args) {
                            completed(args);
                        },
                        error: function (context, args) {
                            error(args);
                        },
                        progress: function (context, args) {
                            progress(args);
                        }
                    }, arg1, arg2, arg3, arg4, arg5);
                });
            } else if (typeof ($) === "function" && $.Deferred) {
                return $.Deferred(function (dfd) {
                    promise({
                        complete: function (context, args) {
                            dfd.resolveWith(context, [args]);
                        },
                        error: function (context, args) {
                            dfd.rejectWith(context, [args]);
                        },
                        progress: function (context, args) {
                            dfd.notifyWith(context, [args]);
                        }
                    }, arg1, arg2, arg3, arg4, arg5);
                }).promise();
            } else {
                throw "linq2indexedDB: No framework (WinJS or jQuery) that supports promises found. Please ensure jQuery or WinJS is referenced before the linq2indexedDB.js file.";
            }
        },
        log: function () {
            if ((window && typeof (window.console) === "undefined") || !enableLogging) {
                return false;
            }

            var currtime = (function currentTime() {
                var time = new Date();
                return time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + '.' + time.getMilliseconds();
            })();

            var args = [];
            var severity = arguments[0];

            args.push(currtime + ' Linq2IndexedDB: ');

            for (var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            switch (severity) {
                case linq2indexedDB.prototype.utilities.severity.exception:
                    if (window.console.exception) {
                        window.console.exception.apply(console, args);
                    } else {
                        window.console.error.apply(console, args);
                    }
                    break;
                case linq2indexedDB.prototype.utilities.severity.error:
                    window.console.error.apply(console, args);
                    break;
                case linq2indexedDB.prototype.utilities.severity.warning:
                    window.console.warning.apply(console, args);
                    break;
                case linq2indexedDB.prototype.utilities.severity.information:
                    window.console.log.apply(console, args);
                    break;
                default:
                    window.console.log.apply(console, args);
            }

            return true;
        },
        logError: function (error) {
            return linq2indexedDB.prototype.utilities.log(error.severity, error.message, error.type, error.method, error.orignialError);
        },
        filterSort: function (data, filters, sortClauses) {
            var returnData = [];

            for (var i = 0; i < data.length; i++) {
                if (utilities.isDataValid(data[i].data, filters)) {
                    returnData = utilities.addToSortedArray(returnData, data[i], sortClauses);
                }
            }

            return returnData;
        },
        isDataValid: function (data, filters) {
            var isValid = true;

            for (var i = 0; i < filters.length; i++) {
                var filterValid = filters[i].filter.isValid(data, filters[i]);
                if (filters[i].isNotClause) {
                    filterValid = !filterValid;
                }
                if (filters[i].isAndClause) {
                    isValid = isValid && filterValid;
                } else if (filters[i].isOrClause) {
                    isValid = isValid || filterValid;
                }
            }
            return isValid;
        },
        addToSortedArray: function (array, data, sortClauses) {
            var newArray = [];
            if (array.length == 0 || sortClauses.length == 0) {
                newArray = array;
                newArray.push(data);
            } else {
                var valueAdded = false;
                for (var i = 0; i < array.length; i++) {
                    var valueX = array[i].data;
                    var valueY = data.data;
                    for (var j = 0; j < sortClauses.length; j++) {
                        var sortPropvalueX = linq2indexedDB.prototype.utilities.getPropertyValue(valueX, sortClauses[j].propertyName);
                        var sortPropvalueY = linq2indexedDB.prototype.utilities.getPropertyValue(valueY, sortClauses[j].propertyName);

                        if (sortPropvalueX != sortPropvalueY) {
                            if ((sortClauses[j].descending && sortPropvalueX > sortPropvalueY)
                                || (!sortClauses[j].descending && sortPropvalueX < sortPropvalueY)) {
                                newArray.push(array[i]);
                            } else {
                                if (!valueAdded) {
                                    valueAdded = true;
                                    newArray.push(data);
                                }
                                newArray.push(array[i]);
                            }
                        }
                        else if (j == (sortClauses.length - 1)) {
                            newArray.push(array[i]);
                        }
                    }
                }

                // Add at the end
                if (!valueAdded) {
                    newArray.push(data);
                }
            }
            return newArray;
        },
        serialize: function (key, value) {
            if (typeof value === 'function') {
                return value.toString();
            }
            return value;
        },
        deserialize: function (key, value) {
            if (value && typeof value === "string" && value.substr(0, 8) == "function") {
                var startBody = value.indexOf('{') + 1;
                var endBody = value.lastIndexOf('}');
                var startArgs = value.indexOf('(') + 1;
                var endArgs = value.indexOf(')');

                return new Function(value.substring(startArgs, endArgs), value.substring(startBody, endBody));
            }
            return value;
        },
        getPropertyValue: function (data, propertyName) {
            var structure = propertyName.split(".");
            var value = data;
            for (var i = 0; i < structure.length; i++) {
                if (value) {
                    value = value[structure[i]];
                }
            }
            return value;
        },
        setPropertyValue: function (data, propertyName, value) {
            var structure = propertyName.split(".");
            var obj = data;
            for (var i = 0; i < structure.length; i++) {
                if (i != (structure.length - 1)) {
                    obj[structure[i]] = {};
                    obj = obj[structure[i]];
                }
                else {
                    obj[structure[i]] = value;
                }
            }
            return obj;
        },
        severity: {
            information: 0,
            warning: 1,
            error: 2,
            exception: 3
        }
    };

    linq2indexedDB.prototype.utilities = utilities;
})(typeof Windows !== "undefined");

if (typeof window !== "undefined") {
    // UI Thread

    // Namespace linq2indexedDB.prototype.core
    (function (window, isMetroApp) {
        "use strict";

        // Region variables
        var defaultDatabaseName = "Default";
        var implementations = {
            NONE: 0,
            NATIVE: 1,
            MICROSOFT: 2,
            MOZILLA: 3,
            GOOGLE: 4,
            MICROSOFTPROTOTYPE: 5,
            SHIM: 6
        };
        var transactionTypes = {
            READ_ONLY: "readonly",
            READ_WRITE: "readwrite",
            VERSION_CHANGE: "versionchange"
        };
        var implementation = initializeIndexedDb();
        var handlers = {
            IDBRequest: function (request) {
                return deferredHandler(IDBRequestHandler, request);
            },
            IDBBlockedRequest: function (request) {
                return deferredHandler(IDBBlockedRequestHandler, request);
            },
            IDBOpenDBRequest: function (request) {
                return deferredHandler(IDBOpenDbRequestHandler, request);
            },
            IDBDatabase: function (database) {
                return deferredHandler(IDBDatabaseHandler, database);
            },
            IDBTransaction: function (txn) {
                return deferredHandler(IDBTransactionHandler, txn);
            },
            IDBCursorRequest: function (request) {
                return deferredHandler(IDBCursorRequestHandler, request);
            }
        };

        //Copyright (c) 2010 Nicholas C. Zakas. All rights reserved.
        //MIT License

        function eventTarget() {
            this._listeners = {};
        }

        eventTarget.prototype = {
            constructor: eventTarget,

            addListener: function (type, listener) {
                if (!linq2indexedDB.prototype.utilities.isArray(type)) {
                    type = [type];
                }

                for (var i = 0; i < type.length; i++) {
                    if (typeof this._listeners[type[i]] == "undefined") {
                        this._listeners[type[i]] = [];
                    }

                    this._listeners[type[i]].push(listener);
                }
            },

            fire: function (event) {
                if (typeof event == "string") {
                    event = { type: event };
                }
                if (!event.target) {
                    event.target = this;
                }

                if (!event.type) { //falsy
                    throw new Error("Event object missing 'type' property.");
                }

                if (this._listeners[event.type] instanceof Array) {
                    var listeners = this._listeners[event.type];
                    for (var i = 0, len = listeners.length; i < len; i++) {
                        listeners[i].call(this, event);
                    }
                }
            },

            removeListener: function (type, listener) {
                if (!linq2indexedDB.prototype.utilities.isArray(type)) {
                    type = [type];
                }

                for (var j = 0; j < type[j].length; j++) {
                    if (this._listeners[type[j]] instanceof Array) {
                        var listeners = this._listeners[type[j]];
                        for (var i = 0, len = listeners.length; i < len; i++) {
                            if (listeners[i] === listener) {
                                listeners.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        };
        // End copyright

        var dbEvents = {
            objectStoreCreated: "Object store created",
            objectStoreRemoved: "Object store removed",
            indexCreated: "Index created",
            indexRemoved: "Index removed",
            databaseRemoved: "Database removed",
            databaseBlocked: "Database blocked",
            databaseUpgrade: "Database upgrade",
            databaseOpened: "Database opened"
        };

        var dataEvents = {
            dataInserted: "Data inserted",
            dataUpdated: "Data updated",
            dataRemoved: "Data removed",
            objectStoreCleared: "Object store cleared"
        };

        var upgradingDatabase = false;

        var internal = {
            db: function (pw, name, version) {
                var req;
                try {
                    // Initializing defaults
                    name = name ? name : defaultDatabaseName;

                    // Creating a new database conection
                    if (version) {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "db opening", name, version);
                        req = window.indexedDB.open(name, version);
                    } else {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "db opening", name);
                        req = window.indexedDB.open(name);
                    }

                    // Handle the events of the creation of the database connection
                    handlers.IDBOpenDBRequest(req).then(
                        function (args /*db, e*/) {
                            var db = args[0];
                            var e = args[1];
                            // Database connection established

                            // Handle the events on the database.
                            handlers.IDBDatabase(db).then(
                                function (/*result, event*/) {
                                    // No done present.
                                },
                                function (args1/*error, event*/) {
                                    // Database error or abort
                                    linq2indexedDB.prototype.core.closeDatabaseConnection(args1[1].target);
                                    // When an error occures the result will already be resolved. This way calling the reject won't case a thing
                                },
                                function (args1 /*result, event*/) {
                                    var event = args1[1];
                                    if (event) {
                                        // Sending a notify won't have any effect because the result is already resolved. There is nothing more to do than close the current connection.
                                        if (event.type === "versionchange") {
                                            if (event.version != event.target.db.version) {
                                                // If the version is changed and the current version is different from the requested version, the connection needs to get closed.
                                                linq2indexedDB.prototype.core.closeDatabaseConnection(event.target);
                                            }
                                        }
                                    }
                                });

                            var currentVersion = internal.getDatabaseVersion(db);
                            if (currentVersion < version || (version == -1) || currentVersion == "") {
                                // Current version deferres from the requested version, database upgrade needed
                                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "DB Promise upgradeneeded", this, db, e, db.connectionId);
                                internal.changeDatabaseStructure(db, version || 1).then(
                                    function (args1 /*txn, event*/) {
                                        var txn = args1[0];
                                        var event = args1[1];

                                        // Fake the onupgrade event.
                                        var context = txn.db;
                                        context.transaction = txn;

                                        var upgardeEvent = {};
                                        upgardeEvent.type = "upgradeneeded";
                                        upgardeEvent.newVersion = version;
                                        upgardeEvent.oldVersion = currentVersion;
                                        upgardeEvent.originalEvent = event;

                                        linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseUpgrade, data: upgardeEvent });
                                        pw.progress(context, [txn, upgardeEvent]);

                                        handlers.IDBTransaction(txn).then(function (/*trans, args*/) {
                                            // When completed return the db + event of the original request.
                                            pw.complete(this, args);
                                        },
                                        function (args2 /*err, ev*/) {
                                            //txn error or abort
                                            pw.error(this, args2);
                                        });
                                    },
                                    function (args1 /*err, event*/) {
                                        // txn error or abort
                                        pw.error(this, args1);
                                    },
                                    function (args1 /*result, event*/) {
                                        // txn blocked
                                        linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseBlocked, data: args1 });
                                        pw.progress(this, args1);
                                    });
                            } else if (version && version < currentVersion) {
                                linq2indexedDB.prototype.core.closeDatabaseConnection(db);
                                var err = {
                                    severity: linq2indexedDB.prototype.utilities.severity.error,
                                    type: "VersionError",
                                    message: "You are trying to open the database in a lower version (" + version + ") than the current version of the database",
                                    method: "db"
                                };
                                linq2indexedDB.prototype.utilities.logError(err);
                                pw.error(this, err);
                            }
                            else {
                                // Database Connection resolved.
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseOpened, data: db });
                                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "DB Promise resolved", db, e);
                                pw.complete(this, [db, e]);
                            }
                        },
                        function (args /*error, e*/) {
                            // Database connection error or abort
                            var err = internal.wrapError(args[1], "db");

                            // Fix for firefox & chrome
                            if (args[1].target && args[1].target.errorCode == 12) {
                                err.type = "VersionError";
                            }

                            if (err.type == "VersionError") {
                                err.message = "You are trying to open the database in a lower version (" + version + ") than the current version of the database";
                            }

                            // Fix for firefox & chrome
                            if (args[1].target && args[1].target.errorCode == 8) {
                                err.type = "AbortError";
                            }

                            if (err.type == "AbortError") {
                                err.message = "The VERSION_CHANGE transaction was aborted.";
                            }
                            // For old firefox implementations
                            linq2indexedDB.prototype.utilities.logError(err);
                            pw.error(this, err);
                        },
                        function (args /*result, e*/) {
                            // Database upgrade + db blocked
                            if (args[1].type == "blocked") {
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseBlocked, data: args });
                            } else if (args[1].type == "upgradeneeded") {
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseUpgrade, data: args });
                            }
                            pw.progress(this, args);
                        }
                    );
                } catch (ex) {
                    var error = internal.wrapException(ex, "db");
                    if ((ex.INVALID_ACCESS_ERR && ex.code == ex.INVALID_ACCESS_ERR) || ex.name == "InvalidAccessError") {
                        error.type = "InvalidAccessError";
                        error.message = "You are trying to open a database with a negative version number.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    pw.error(this, error);
                }
            },
            transaction: function (pw, db, objectStoreNames, transactionType, autoGenerateAllowed) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction promise started", db, objectStoreNames, transactionType);

                // Initialize defaults
                if (!linq2indexedDB.prototype.utilities.isArray(objectStoreNames)) objectStoreNames = [objectStoreNames];
                transactionType = transactionType || linq2indexedDB.prototype.core.transactionTypes.READ_ONLY;

                var nonExistingObjectStores = [];

                try {
                    // Check for non-existing object stores
                    for (var i = 0; i < objectStoreNames.length; i++) {
                        if (!db.objectStoreNames || !db.objectStoreNames.contains(objectStoreNames[i])) {
                            nonExistingObjectStores.push(objectStoreNames[i]);
                        }
                    }

                    // When non-existing object stores are found and the autoGenerateAllowed is true.
                    // Then create these object stores
                    if (nonExistingObjectStores.length > 0 && autoGenerateAllowed) {
                        // setTimeout is necessary when multiple request to generate an index come together.
                        // This can result in a deadlock situation, there for the setTimeout
                        setTimeout(function() {
                            upgradingDatabase = true;
                            var version = internal.getDatabaseVersion(db) + 1;
                            var dbName = db.name;
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction database upgrade needed: ", db);
                            // Closing the current connections so it won't block the upgrade.
                            linq2indexedDB.prototype.core.closeDatabaseConnection(db);
                            // Open a new connection with the new version
                            linq2indexedDB.prototype.core.db(dbName, version).then(function (args /*dbConnection, event*/) {
                                upgradingDatabase = false;
                                // Necessary for getting it work in WIN 8, WinJS promises have troubles with nesting promises
                                var txn = args[0].transaction(objectStoreNames, transactionType);

                                // Handle transaction events
                                handlers.IDBTransaction(txn).then(function(args1 /*result, event*/) {
                                    // txn completed
                                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction completed.", txn);
                                    pw.complete(this, args1);
                                },
                                    function(args1 /*err, event*/) {
                                        // txn error or abort
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Transaction error/abort.", args1);
                                        pw.error(this, args1);
                                    });

                                // txn created
                                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction created.", txn);
                                pw.progress(txn, [txn]);
                            },
                                function(args /*error, event*/) {
                                    // When an error occures, bubble up.
                                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Transaction error.", args);
                                    pw.error(this, args);
                                },
                                function(args /*txn, event*/) {
                                    var event = args[1];

                                    // When an upgradeneeded event is thrown, create the non-existing object stores
                                    if (event.type == "upgradeneeded") {
                                        for (var j = 0; j < nonExistingObjectStores.length; j++) {
                                            linq2indexedDB.prototype.core.createObjectStore(args[0], nonExistingObjectStores[j], { keyPath: "Id", autoIncrement: true });
                                        }
                                    }
                                });
                        }, upgradingDatabase ? 10 : 1);
                    } else {
                        // If no non-existing object stores are found, create the transaction.
                        var transaction = db.transaction(objectStoreNames, transactionType);

                        // Handle transaction events
                        handlers.IDBTransaction(transaction).then(function(args /*result, event*/) {
                            // txn completed
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction completed.", args);
                            pw.complete(this, args);
                        },
                            function (args /*err, event*/) {
                                var err = internal.wrapError(args[1], "transaction");
                                if (args[1].type == "abort") {
                                    err.type = "abort";
                                    err.severity = "abort";
                                    err.message = "Transaction was aborted";
                                }

                                // Fix for firefox & chrome
                                if (args[1].target && args[1].target.errorCode == 4) {
                                    err.type = "ConstraintError";
                                }

                                if (err.type == "ConstraintError") {
                                    err.message = "A mutation operation in the transaction failed. For more details look at the error on the instert, update, remove or clear statement.";
                                }
                                // txn error or abort
                                linq2indexedDB.prototype.utilities.logError(err);
                                pw.error(this, err);
                            });

                        // txn created
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Transaction transaction created.", transaction);
                        pw.progress(transaction, [transaction]);
                    }
                }
                catch (ex) {
                    var error = internal.wrapException(ex, "transaction");
                    if ((ex.INVALID_ACCESS_ERR && ex.code == ex.INVALID_ACCESS_ERR) || ex.name == "InvalidAccessError") {
                        error.type = "InvalidAccessError";
                        error.message = "You are trying to open a transaction without providing an object store as scope.";
                    }
                    if ((ex.NOT_FOUND_ERR && ex.code == ex.NOT_FOUND_ERR) || ex.name == "NotFoundError") {
                        var objectStores = "";
                        for (var m = 0; m < nonExistingObjectStores.length; m++) {
                            if (m > 0) {
                                objectStores += ", ";
                            }
                            objectStores += nonExistingObjectStores[m];
                        }
                        error.type = "NotFoundError";
                        error.message = "You are trying to open a transaction for object stores (" + objectStores + "), that doesn't exist.";
                    }
                    if ((ex.QUOTA_ERR && ex.code == ex.QUOTA_ERR) || ex.name == "QuotaExceededError") {
                        error.type = "QuotaExceededError";
                        error.message = "The size quota of the indexedDB database is reached.";
                    }
                    if ((ex.UNKNOWN_ERR && ex.code == ex.UNKNOWN_ERR) || ex.name == "UnknownError") {
                        error.type = "UnknownError";
                        error.message = "An I/O exception occured.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    pw.error(this, error);
                }
            },
            changeDatabaseStructure: function (db, version) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "changeDatabaseStructure started", db, version);
                    handlers.IDBBlockedRequest(db.setVersion(version)).then(function (args /*txn, event*/) {
                        // txn created
                        pw.complete(this, args);
                    },
                        function (args /*error, event*/) {
                            // txn error or abort
                            pw.error(this, args);
                        },
                        function (args /*txn, event*/) {
                            // txn blocked
                            pw.progress(this, args);
                        });
                });
            },
            objectStore: function (pw, transaction, objectStoreName) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "objectStore started", transaction, objectStoreName);
                try {
                    var store = transaction.objectStore(objectStoreName);
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "objectStore completed", transaction, store);
                    pw.complete(store, [transaction, store]);
                } catch (ex) {
                    var error = internal.wrapException(ex, "objectStore");
                    if ((ex.NOT_FOUND_ERR && ex.code == ex.NOT_FOUND_ERR) || ex.name == "NotFoundError") {
                        error.type = "NotFoundError";
                        error.message = "You are trying to open an object store (" + objectStoreName + "), that doesn't exist or isn't in side the transaction scope.";
                    }
                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to open an object store (" + objectStoreName + ") outside a transaction.";
                    }

                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(transaction);
                    pw.error(this, error);
                }
            },
            createObjectStore: function (pw, transaction, objectStoreName, objectStoreOptions) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "createObjectStore started", transaction, objectStoreName, objectStoreOptions);
                try {
                    if (!transaction.db.objectStoreNames.contains(objectStoreName)) {
                        // If the object store doesn't exists, create it
                        var options = new Object();

                        if (objectStoreOptions) {
                            if (objectStoreOptions.keyPath) options.keyPath = objectStoreOptions.keyPath;
                            options.autoIncrement = objectStoreOptions.autoIncrement;
                        } else {
                            options.autoIncrement = true;
                        }

                        var store = transaction.db.createObjectStore(objectStoreName, options, options.autoIncrement);

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "ObjectStore Created", transaction, store);
                        linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.objectStoreCreated, data: store });
                        pw.complete(store, [transaction, store]);
                    } else {
                        // If the object store exists, retrieve it
                        linq2indexedDB.prototype.core.objectStore(transaction, objectStoreName).then(function (args /*trans, store*/) {
                            // store resolved
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "ObjectStore Found", args[1], objectStoreName);
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "createObjectStore Promise", args[0], args[1]);
                            pw.complete(store, args);
                        },
                            function (args /*error, event*/) {
                                // store error
                                pw.error(this, args);
                            });
                    }
                } catch (ex) {
                    // store exception
                    var error = internal.wrapException(ex, "createObjectStore");
                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to create an object store in a readonly or readwrite transaction.";
                    }
                    if ((ex.INVALID_ACCESS_ERR && ex.code == ex.INVALID_ACCESS_ERR) || ex.name == "InvalidAccessError") {
                        error.type = "InvalidAccessError";
                        error.message = "The object store can't have autoIncrement on and an empty string or an array with an empty string as keyPath.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    if (error.type != "InvalidStateError") {
                        linq2indexedDB.prototype.core.abortTransaction(transaction);
                    }
                    pw.error(this, error);
                }
            },
            deleteObjectStore: function (pw, transaction, objectStoreName) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "deleteObjectStore Promise started", transaction, objectStoreName);
                try {
                    transaction.db.deleteObjectStore(objectStoreName);
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "ObjectStore Deleted", objectStoreName);
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "deleteObjectStore completed", objectStoreName);
                    linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.objectStoreRemoved, data: objectStoreName });
                    pw.complete(this, [transaction, objectStoreName]);
                } catch (ex) {
                    var error = internal.wrapException(ex, "deleteObjectStore");
                    if ((ex.NOT_FOUND_ERR && ex.code == ex.NOT_FOUND_ERR) || ex.name == "NotFoundError") {
                        error.type = "NotFoundError";
                        error.message = "You are trying to delete an object store (" + objectStoreName + "), that doesn't exist.";
                    }
                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to delete an object store in a readonly or readwrite transaction.";
                    }
                    // store exception
                    linq2indexedDB.prototype.utilities.logError(error);
                    if (error.type != "InvalidStateError") {
                        linq2indexedDB.prototype.core.abortTransaction(transaction);
                    }
                    pw.error(this, error);
                }
            },
            index: function (pw, objectStore, propertyName, autoGenerateAllowed) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Index started", objectStore, propertyName, autoGenerateAllowed);
                var indexName = propertyName;
                if (propertyName.indexOf(linq2indexedDB.prototype.core.indexSuffix) == -1) {
                    indexName = indexName + linq2indexedDB.prototype.core.indexSuffix;
                }

                try {
                    if (!objectStore.indexNames.contains(indexName) && autoGenerateAllowed) {
                        // setTimeout is necessary when multiple request to generate an index come together.
                        // This can result in a deadlock situation, there for the setTimeout
                        setTimeout((function(objStore) {
                            upgradingDatabase = true;
                            // If index doesn't exists, create it if autoGenerateAllowed
                            var version = internal.getDatabaseVersion(objStore.transaction.db) + 1;
                            var dbName = objStore.transaction.db.name;
                            var transactionType = objStore.transaction.mode;
                            var objectStoreNames = [objStore.name]; //transaction.objectStoreNames;
                            var objectStoreName = objStore.name;
                            // Close the currenct database connections so it won't block
                            linq2indexedDB.prototype.core.closeDatabaseConnection(objStore);

                            // Open a new connection with the new version
                            linq2indexedDB.prototype.core.db(dbName, version).then(function (args /*dbConnection, event*/) {
                                upgradingDatabase = false;
                                // When the upgrade is completed, the index can be resolved.
                                linq2indexedDB.prototype.core.transaction(args[0], objectStoreNames, transactionType, autoGenerateAllowed).then(function(/*transaction, ev*/) {
                                    // txn completed
                                    // TODO: what to do in this case
                                },
                                    function(args1 /*error, ev*/) {
                                        // txn error or abort
                                        pw.error(this, args1);
                                    },
                                    function(args1 /*transaction*/) {
                                        // txn created
                                        linq2indexedDB.prototype.core.index(linq2indexedDB.prototype.core.objectStore(args1[0], objectStoreName), propertyName).then(function(args2 /*trans, index, store*/) {
                                            pw.complete(this, args2);
                                        }, function(args2 /*error, ev*/) {
                                            // txn error or abort
                                            pw.error(this, args2);
                                        });
                                    });
                            },
                                function(args /*error, event*/) {
                                    // When an error occures, bubble up.
                                    pw.error(this, args);
                                },
                                function(args /*trans, event*/) {
                                    var trans = args[0];
                                    var event = args[1];

                                    // When an upgradeneeded event is thrown, create the non-existing object stores
                                    if (event.type == "upgradeneeded") {
                                        linq2indexedDB.prototype.core.createIndex(linq2indexedDB.prototype.core.objectStore(trans, objectStoreName), propertyName).then(function (/*index, store, transaction*/) {
                                            // index created
                                        },
                                        function(args1 /*error, ev*/) {
                                            // When an error occures, bubble up.
                                            pw.error(this, args1);
                                        });
                                    }
                                });
                        })(objectStore), upgradingDatabase ? 10 : 1);
                     } else {
                         // If index exists, resolve it
                         var index = objectStore.index(indexName);
                         linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Index completed", objectStore.transaction, index, objectStore);
                         pw.complete(this, [objectStore.transaction, index, objectStore]);
                     }
                } catch (ex) {
                    var error = internal.wrapException(ex, "index");
                    if ((ex.NOT_FOUND_ERR && ex.code == ex.NOT_FOUND_ERR) || ex.name == "NotFoundError") {
                        error.type = "NotFoundError";
                        error.message = "You are trying to open an index (" + indexName + "), that doesn't exist.";
                    }
                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to open an object store (" + indexName + ") outside a transaction.";
                    }
                    // index exception
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                    pw.error(this, error);
                }
            },
            createIndex: function (pw, objectStore, propertyName, indexOptions) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "createIndex started", objectStore, propertyName, indexOptions);
                try {
                    var indexName = propertyName;
                    if (propertyName.indexOf(linq2indexedDB.prototype.core.indexSuffix) == -1) {
                        indexName = indexName + linq2indexedDB.prototype.core.indexSuffix;
                    }

                    if (!objectStore.indexNames.contains(indexName)) {
                        var index = objectStore.createIndex(indexName, propertyName, { unique: indexOptions ? indexOptions.unique : false, multiRow: indexOptions ? indexOptions.multirow : false, multiEntry: indexOptions ? indexOptions.multirow : false });
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "createIndex completed", objectStore.transaction, index, objectStore);
                        linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.indexCreated, data: index });
                        pw.complete(this, [objectStore.transaction, index, objectStore]);
                    } else {
                        // if the index exists retrieve it
                        linq2indexedDB.prototype.core.index(objectStore, propertyName, false).then(function (args) {
                            pw.complete(this, args);
                        });
                    }
                } catch (ex) {
                    // store exception
                    var error = internal.wrapException(ex, "createIndex");
                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to create an index in a readonly or readwrite transaction.";
                    }
                    if (error.type != "InvalidStateError") {
                        linq2indexedDB.prototype.core.abortTransaction(transaction);
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    pw.error(this, error);
                }
            },
            deleteIndex: function (pw, objectStore, propertyName) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "deleteIndex started", objectStore, propertyName);
                var indexName = propertyName;
                if (propertyName.indexOf(linq2indexedDB.prototype.core.indexSuffix) == -1) {
                    indexName = indexName + linq2indexedDB.prototype.core.indexSuffix;
                }

                try {
                    objectStore.deleteIndex(indexName);
                    linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.indexRemoved, data: indexName });
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "deleteIndex completed", objectStore.transaction, propertyName, objectStore);
                    pw.complete(this, [objectStore.transaction, propertyName, objectStore]);
                } catch (ex) {
                    var error = internal.wrapException(ex, "deleteIndex");
                    if ((ex.NOT_FOUND_ERR && ex.code == ex.NOT_FOUND_ERR) || ex.name == "NotFoundError") {
                        error.type = "NotFoundError";
                        error.message = "You are trying to delete an index (" + indexName + ", propertyName: " + propertyName + " ), that doesn't exist.";
                    }
                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to delete an index in a readonly or readwrite transaction.";
                    }
                    // store exception
                    linq2indexedDB.prototype.utilities.logError(error);
                    if (error.type != "InvalidStateError") {
                        linq2indexedDB.prototype.core.abortTransaction(transaction);
                    }
                    pw.error(this, error);
                }
            },
            cursor: function (pw, source, range, direction) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor Promise Started", source);
                var keyRange;
                var returnData = [];
                var request;

                try {

                    keyRange = range;

                    if (!keyRange) {
                        if (implementation != implementations.GOOGLE) {
                            keyRange = IDBKeyRange.lowerBound(0);
                        } else {
                            keyRange = IDBKeyRange.lowerBound(parseFloat(0));
                        }
                    }

                    // direction can not be null when passed.
                    if (direction) {
                        request = handlers.IDBCursorRequest(source.openCursor(keyRange, direction));
                    } else if (keyRange) {
                        request = handlers.IDBCursorRequest(source.openCursor(keyRange));
                    } else {
                        request = handlers.IDBCursorRequest(source.openCursor());
                    }

                    request.then(function (args1 /*result, e*/) {
                        var e = args1[1];
                        var transaction = source.transaction || source.objectStore.transaction;

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor completed", returnData, transaction, e);
                        pw.complete(this, [returnData, transaction, e]);
                    },
                        function (args /*error, e*/) {
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Cursor error", args);
                            pw.error(this, args);
                        },
                        function (args /*result, e*/) {
                            var result = args[0];
                            var e = args[1];

                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor progress", result, e);
                            if (result.value) {
                                var progressObj = {
                                    data: result.value,
                                    key: result.primaryKey,
                                    skip: function(number) {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor skip", result, e);
                                        try {
                                            result.advance(number);
                                        }
                                        catch (advanceEx) {
                                            var advanceErr = internal.wrapException(advanceEx, "cursor - skip");

                                            if ((advanceEx.DATA_ERR && advanceEx.code == advanceEx.DATA_ERR) || advanceEx.name == "DataError") {
                                                advanceErr.type = "DataError";
                                                advanceErr.message = "The provided range parameter isn't a valid key or key range.";
                                            }

                                            if (advanceEx.name == "TypeError") {
                                                advanceErr.type = "TypeError";
                                                advanceErr.message = "The provided count parameter is zero or a negative number.";
                                            }

                                            if ((advanceEx.INVALID_STATE_ERR && advanceEx.code == advanceEx.INVALID_STATE_ERR) || advanceEx.name == "InvalidStateError") {
                                                advanceErr.type = "InvalidStateError";
                                                advanceErr.message = "You are trying to skip data on a removed object store.";
                                            }
                                            linq2indexedDB.prototype.utilities.logError(advanceErr);
                                            linq2indexedDB.prototype.core.abortTransaction(txn);
                                            pw.error(this, advanceErr);
                                        }
                                    },
                                    update: function(obj) {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor update", result, e);
                                        try {
                                            result.update(obj);
                                        }
                                        catch (updateEx) {
                                            var updateError = internal.wrapException(updateEx, "cursor - update");

                                            if ((updateEx.DATA_ERR  && updateEx.code == updateEx.DATA_ERR) || updateEx.name == "DataError") {
                                                updateError.type = "DataError";
                                                updateError.message = "The underlying object store uses in-line keys and the property in value at the object store's key path does not match the key in this cursor's position.";
                                            }

                                            if ((updateEx.READ_ONLY_ERR && ex.code == updateEx.READ_ONLY_ERR) || updateEx.name == "ReadOnlyError") {
                                                updateError.type = "ReadOnlyError";
                                                updateError.message = "You are trying to update data in a readonly transaction.";
                                            }

                                            if (updateEx.name == "TransactionInactiveError") {
                                                updateError.type = "TransactionInactiveError";
                                                updateError.message = "You are trying to update data on an inactieve transaction. (The transaction was already aborted or committed)";
                                            }

                                            if ((updateEx.DATA_CLONE_ERR && updateEx.code == updateEx.DATA_CLONE_ERR) || updateEx.name == "DataCloneError") {
                                                updateError.type = "DataCloneError";
                                                updateError.message = "The data you are trying to update could not be cloned. Your data probably contains a function which can not be cloned by default. Try using the serialize method to update the data.";
                                            }

                                            if ((updateEx.INVALID_STATE_ERR && updateEx.code == updateEx.INVALID_STATE_ERR) || updateEx.name == "InvalidStateError") {
                                                updateError.type = "InvalidStateError";
                                                updateError.message = "You are trying to update data on a removed object store.";
                                            }

                                            linq2indexedDB.prototype.utilities.logError(updateError);
                                            linq2indexedDB.prototype.core.abortTransaction(txn);
                                            pw.error(this, updateError);
                                        }
                                    },
                                    remove: function() {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Cursor remove", result, e);
                                        try {
                                            result["delete"]();
                                        }
                                        catch (deleteEx) {
                                            var deleteError = internal.wrapException(deleteEx, "cursor - delete");

                                            if ((deleteEx.READ_ONLY_ERR && deleteEx.code == deleteEx.READ_ONLY_ERR) || deleteEx.name == "ReadOnlyError") {
                                                deleteError.type = "ReadOnlyError";
                                                deleteError.message = "You are trying to remove data in a readonly transaction.";
                                            }

                                            if (deleteEx.name == "TransactionInactiveError") {
                                                deleteError.type = "TransactionInactiveError";
                                                deleteError.message = "You are trying to remove data on an inactieve transaction. (The transaction was already aborted or committed)";
                                            }

                                            if ((deleteEx.INVALID_STATE_ERR && deleteEx.code == deleteEx.INVALID_STATE_ERR) || deleteEx.name == "InvalidStateError") {
                                                deleteError.type = "InvalidStateError";
                                                deleteError.message = "You are trying to remove data on a removed object store.";
                                            }

                                            linq2indexedDB.prototype.utilities.logError(deleteError);
                                            linq2indexedDB.prototype.core.abortTransaction(txn);
                                            pw.error(this, deleteError);
                                        }
                                    }
                                };

                                pw.progress(this, [progressObj, result, e]);
                                returnData.push({data: progressObj.data ,key: progressObj.key });
                            }
                            result["continue"]();
                        });
                } catch (ex) {
                    var txn = source.transaction || source.objectStore.transaction;
                    var error = internal.wrapException(ex, "cursor");

                    if ((ex.DATA_ERR && error.code == ex.DATA_ERR) || ex.name == "DataError") {
                        error.type = "DataError";
                        error.message = "The provided range parameter isn't a valid key or key range.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to retrieve data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if (ex.name == "TypeError") {
                        error.type = "TypeError";
                        error.message = "The provided directory parameter is invalid";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to insert data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(txn);
                    pw.error(this, error);
                }
                finally {
                    keyRange = null;
                }
            },
            keyCursor: function (pw, index, range, direction) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor Started", index, range, direction);
                var returnData = [];

                try {
                    var request;
                    var keyRange = range;

                    if (!keyRange) {
                        keyRange = IDBKeyRange.lowerBound(0);
                    }

                    // direction can not be null when passed.
                    if (direction) {
                        request = handlers.IDBCursorRequest(source.openKeyCursor(keyRange, direction));
                    } else {
                        request = handlers.IDBCursorRequest(source.openKeyCursor(keyRange));
                    }

                    request.then(function (args /*result, e*/) {
                        var e = args[1];

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor completed", returnData, index.objectStore.transaction, e);
                        pw.complete(this, [returnData, index.objectStore.transaction, e]);
                    },
                        function (args /*error, e*/) {
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "keyCursor error", args);
                            pw.error(this, args);
                        },
                        function (args /*result, e*/) {
                            var result = args[0];
                            var e = args[1];

                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor progress", result, e);
                            if (result.value) {
                                var progressObj = {
                                    data: result.value,
                                    key: result.primaryKey,
                                    skip: function (number) {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor skip", result, e);
                                        try {
                                            result.advance(number);
                                        }
                                        catch (advanceEx) {
                                            var advanceErr = internal.wrapException(advanceEx, "keyCursor - skip");

                                            if ((advanceEx.DATA_ERR && advanceEx.code == advanceEx.DATA_ERR) || advanceEx.name == "DataError") {
                                                advanceErr.type = "DataError";
                                                advanceErr.message = "The provided range parameter isn't a valid key or key range.";
                                            }

                                            if (advanceEx.name == "TypeError") {
                                                advanceErr.type = "TypeError";
                                                advanceErr.message = "The provided count parameter is zero or a negative number.";
                                            }

                                            if ((advanceEx.INVALID_STATE_ERR && advanceEx.code == advanceEx.INVALID_STATE_ERR) || advanceEx.name == "InvalidStateError") {
                                                advanceErr.type = "InvalidStateError";
                                                advanceErr.message = "You are trying to skip data on a removed object store.";
                                            }
                                            linq2indexedDB.prototype.utilities.logError(advanceErr);
                                            linq2indexedDB.prototype.core.abortTransaction(index.objectStore.transaction);
                                            pw.error(this, advanceErr);
                                        }
                                    },
                                    update: function (obj) {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor update", result, e);
                                        try {
                                            result.update(obj);
                                        }
                                        catch (updateEx) {
                                            var updateError = internal.wrapException(updateEx, "keyCursor - update");

                                            if ((updateEx.DATA_ERR && updateEx.code == updateEx.DATA_ERR) || updateEx.name == "DataError") {
                                                updateError.type = "DataError";
                                                updateError.message = "The underlying object store uses in-line keys and the property in value at the object store's key path does not match the key in this cursor's position.";
                                            }

                                            if ((updateEx.READ_ONLY_ERR && ex.code == updateEx.READ_ONLY_ERR) || updateEx.name == "ReadOnlyError") {
                                                updateError.type = "ReadOnlyError";
                                                updateError.message = "You are trying to update data in a readonly transaction.";
                                            }

                                            if (updateEx.name == "TransactionInactiveError") {
                                                updateError.type = "TransactionInactiveError";
                                                updateError.message = "You are trying to update data on an inactieve transaction. (The transaction was already aborted or committed)";
                                            }

                                            if ((updateEx.DATA_CLONE_ERR && updateEx.code == updateEx.DATA_CLONE_ERR) || updateEx.name == "DataCloneError") {
                                                updateError.type = "DataCloneError";
                                                updateError.message = "The data you are trying to update could not be cloned. Your data probably contains a function which can not be cloned by default. Try using the serialize method to update the data.";
                                            }

                                            if ((updateEx.INVALID_STATE_ERR && updateEx.code == updateEx.INVALID_STATE_ERR) || updateEx.name == "InvalidStateError") {
                                                updateError.type = "InvalidStateError";
                                                updateError.message = "You are trying to update data on a removed object store.";
                                            }

                                            linq2indexedDB.prototype.utilities.logError(updateError);
                                            linq2indexedDB.prototype.core.abortTransaction(index.objectStore.transaction);
                                            pw.error(this, updateError);
                                        }
                                    },
                                    remove: function () {
                                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "keyCursor remove", result, e);
                                        try {
                                            result["delete"]();
                                        }
                                        catch (deleteEx) {
                                            var deleteError = internal.wrapException(deleteEx, "keyCursor - delete");

                                            if ((deleteEx.READ_ONLY_ERR && deleteEx.code == deleteEx.READ_ONLY_ERR) || deleteEx.name == "ReadOnlyError") {
                                                deleteError.type = "ReadOnlyError";
                                                deleteError.message = "You are trying to remove data in a readonly transaction.";
                                            }

                                            if (deleteEx.name == "TransactionInactiveError") {
                                                deleteError.type = "TransactionInactiveError";
                                                deleteError.message = "You are trying to remove data on an inactieve transaction. (The transaction was already aborted or committed)";
                                            }

                                            if ((deleteEx.INVALID_STATE_ERR && deleteEx.code == deleteEx.INVALID_STATE_ERR) || deleteEx.name == "InvalidStateError") {
                                                deleteError.type = "InvalidStateError";
                                                deleteError.message = "You are trying to remove data on a removed object store.";
                                            }

                                            linq2indexedDB.prototype.utilities.logError(deleteError);
                                            linq2indexedDB.prototype.core.abortTransaction(index.objectStore.transaction);
                                            pw.error(this, deleteError);
                                        }
                                    }
                                };

                                pw.progress(this, [progressObj, result, e]);
                                returnData.push(progressObj.data);
                            }
                            result["continue"]();
                        });
                } catch (ex) {
                    var error = internal.wrapException(ex, "keyCursor");

                    if ((ex.DATA_ERR && error.code == ex.DATA_ERR) || ex.name == "DataError") {
                        error.type = "DataError";
                        error.message = "The provided range parameter isn't a valid key or key range.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to retrieve data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if (ex.name == "TypeError") {
                        error.type = "TypeError";
                        error.message = "The provided directory parameter is invalid";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to insert data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(index.objectStore.transaction);
                    pw.error(this, error);
                }
            },
            get: function (pw, source, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Get Started", source);

                try {
                    handlers.IDBRequest(source.get(key)).then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];
                        var transaction = source.transaction || source.objectStore.transaction;

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Get completed", result, transaction, e);
                        pw.complete(this, [result, transaction, e]);
                    }, function (args /*error, e*/) {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Get error", args);
                        pw.error(this, args);
                    });
                } catch (ex) {
                    var txn = source.transaction || source.objectStore.transaction;
                    var error = internal.wrapException(ex, "get");

                    if (error.code == ex.DATA_ERR || ex.name == "DataError") {
                        error.message = "The provided key isn't a valid key (must be an array, string, date or number).";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to retrieve data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to retrieve data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(txn);
                    pw.error(this, error);
                }
            },
            count: function (pw, source, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Count Started", source);

                try {
                    var req;

                    if (key) {
                        req = source.count(key);
                    }
                    else {
                        req = source.count();
                    }

                    handlers.IDBRequest(req).then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];
                        var transaction = source.transaction || source.objectStore.transaction;

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Count completed", result, transaction, e);
                        pw.complete(this, [result, transaction, e]);
                    }, function (args /*error, e*/) {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Count error", args);
                        pw.error(this, args);
                    });
                } catch (ex) {
                    var txn = source.transaction || source.objectStore.transaction;
                    var error = internal.wrapException(ex, "count");

                    if (error.code == ex.DATA_ERR || ex.name == "DataError") {
                        error.type = "DataError";
                        error.message = "The provided key isn't a valid key or keyRange.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to count data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to count data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(txn);
                    pw.error(this, error);
                }
            },
            getKey: function (pw, index, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "GetKey Started", index, key);

                try {
                    handlers.IDBRequest(index.getKey(key)).then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];

                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "GetKey completed", result, index.objectStore.transaction, e);
                        pw.complete(this, [result, index.objectStore.transaction, e]);
                    }, function (args /*error, e*/) {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "GetKey error", args);
                        pw.error(this, args);
                    });
                } catch (ex) {
                    var error = internal.wrapException(ex, "getKey");

                    if (error.code == ex.DATA_ERR || ex.name == "DataError") {
                        error.type = "DataError";
                        error.message = "The provided key isn't a valid key or keyRange.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to getKey data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to getKey data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(index.objectStore.transaction);
                    pw.error(this, error);
                }
            },
            insert: function (pw, objectStore, data, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Insert Started", objectStore, data, key);
                try {
                    var req;

                    if (key /*&& !store.keyPath*/) {
                        req = handlers.IDBRequest(objectStore.add(data, key));
                    } else {
                        /*if (key) linq2indexedDB.prototype.utilities.log("Key can't be provided when a keyPath is defined on the object store", store, key, data);*/
                        req = handlers.IDBRequest(objectStore.add(data));
                    }

                    req.then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];

                        // Add key to the object if a keypath exists
                        if (objectStore.keyPath) {
                            data[objectStore.keyPath] = result;
                        }

                        linq2indexedDB.prototype.core.dbDataChanged.fire({ type: dataEvents.dataInserted, data: data, objectStore: objectStore });
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Insert completed", data, result, objectStore.transaction, e);
                        pw.complete(this, [data, result, objectStore.transaction, e]);
                    }, function (args /*error, e*/) {
                        var err = internal.wrapError(args[1], "insert");

                        // Fix for firefox & chrome
                        if (args[1].target && args[1].target.errorCode == 4) {
                            err.type = "ConstraintError";
                        }

                        if (err.type == "ConstraintError") {
                            var duplicateKey = key;
                            if (!duplicateKey && objectStore.keyPath) {
                                duplicateKey = data[objectStore.keyPath];
                            }
                            err.message = "A record for the key (" + duplicateKey + ") already exists in the database or one of the properties of the provided data has a unique index declared.";
                        }
                        linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                        linq2indexedDB.prototype.utilities.logError(err);
                        pw.error(this, err);
                    });
                } catch (ex) {
                    var error = internal.wrapException(ex, "insert");

                    if (error.code == ex.DATA_ERR || ex.name == "DataError") {
                        error.type = "DataError";
                        var possibleKey = key;
                        if (!possibleKey && objectStore.keyPath) {
                            possibleKey = data[objectStore.keyPath];
                        }
                        if (!possibleKey) {
                            error.message = "There is no key provided for the data you want to insert for an object store without autoIncrement.";
                        } else if (key && objectStore.keyPath) {
                            error.message = "An external key is provided while the object store expects a keyPath key.";
                        } else if (typeof possibleKey !== "string"
                            && typeof possibleKey !== "number"
                            && typeof possibleKey !== "Date"
                            && !linq2indexedDB.prototype.utilities.isArray(possibleKey)) {
                            error.message = "The provided key isn't a valid key (must be an array, string, date or number).";
                        }
                    }

                    if ((ex.READ_ONLY_ERR && ex.code == ex.READ_ONLY_ERR) || ex.name == "ReadOnlyError") {
                        error.type = "ReadOnlyError";
                        error.message = "You are trying to insert data in a readonly transaction.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to insert data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.DATA_CLONE_ERR && ex.code == ex.DATA_CLONE_ERR) || ex.name == "DataCloneError") {
                        error.type = "DataCloneError";
                        error.message = "The data you are trying to insert could not be cloned. Your data probably contains a function which can not be cloned by default. Try using the serialize method to insert the data.";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to insert data on a removed object store.";
                    }
                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                    pw.error(this, error);
                }
            },
            update: function (pw, objectStore, data, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Update Started", objectStore, data, key);

                try {
                    var req;
                    if (key /*&& !store.keyPath*/) {
                        req = handlers.IDBRequest(objectStore.put(data, key));
                    } else {
                        /*if (key) linq2indexedDB.prototype.utilities.log("Key can't be provided when a keyPath is defined on the object store", store, key, data);*/
                        req = handlers.IDBRequest(objectStore.put(data));
                    }
                    req.then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];

                        if (objectStore.keyPath && data[objectStore.keyPath] === undefined) {
                            data[objectStore.keyPath] = result;
                        }

                        linq2indexedDB.prototype.core.dbDataChanged.fire({ type: dataEvents.dataUpdated, data: data, objectStore: objectStore });
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Update completed", data, result, objectStore.transaction, e);
                        pw.complete(this, [data, result, objectStore.transaction, e]);
                    }, function (args /*error, e*/) {
                        var err = internal.wrapError(args[1], "update");
                        linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                        linq2indexedDB.prototype.utilities.logError(err);
                        pw.error(this, err);
                    });
                } catch (ex) {
                    var error = internal.wrapException(ex, "update");

                    if (error.code == ex.DATA_ERR || ex.name == "DataError") {
                        error.type = "DataError";
                        var possibleKey = key;
                        if (!possibleKey && objectStore.keyPath) {
                            possibleKey = data[objectStore.keyPath];
                        }
                        if (!possibleKey) {
                            error.message = "There is no key provided for the data you want to update for an object store without autoIncrement.";
                        } else if (key && objectStore.keyPath) {
                            error.message = "An external key is provided while the object store expects a keyPath key.";
                        } else if (typeof possibleKey !== "string"
                            && typeof possibleKey !== "number"
                            && typeof possibleKey !== "Date"
                            && !linq2indexedDB.prototype.utilities.isArray(possibleKey)) {
                            error.message = "The provided key isn't a valid key (must be an array, string, date or number).";
                        }
                    }

                    if ((ex.READ_ONLY_ERR && ex.code == ex.READ_ONLY_ERR) || ex.name == "ReadOnlyError") {
                        error.type = "ReadOnlyError";
                        error.message = "You are trying to update data in a readonly transaction.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to update data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.DATA_CLONE_ERR && ex.code == ex.DATA_CLONE_ERR) || ex.name == "DataCloneError") {
                        error.type = "DataCloneError";
                        error.message = "The data you are trying to update could not be cloned. Your data probably contains a function which can not be cloned by default. Try using the serialize method to update the data.";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to update data on a removed object store.";
                    }

                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                    pw.error(this, error);
                }
            },
            remove: function (pw, objectStore, key) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Remove Started", objectStore, key);

                try {
                    handlers.IDBRequest(objectStore["delete"](key)).then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];

                        linq2indexedDB.prototype.core.dbDataChanged.fire({ type: dataEvents.dataRemoved, data: key, objectStore: objectStore });
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Remove completed", result, objectStore.transaction, e);
                        pw.complete(this, [result, objectStore.transaction, e]);
                    },
                        function (args /*error, e*/) {
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Remove error", args);
                            pw.error(this, args);
                        });
                } catch (ex) {
                    var error = internal.wrapException(ex, "delete");

                    if ((ex.READ_ONLY_ERR && ex.code == ex.READ_ONLY_ERR) || ex.name == "ReadOnlyError") {
                        error.type = "ReadOnlyError";
                        error.message = "You are trying to remove data in a readonly transaction.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to remove data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to remove data on a removed object store.";
                    }

                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                    pw.error(this, error);
                }
            },
            clear: function (pw, objectStore) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Clear Started", objectStore);
                try {
                    handlers.IDBRequest(objectStore.clear()).then(function (args /*result, e*/) {
                        var result = args[0];
                        var e = args[1];

                        linq2indexedDB.prototype.core.dbDataChanged.fire({ type: dataEvents.objectStoreCleared, objectStore: objectStore });
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Clear completed", result, objectStore.transaction, e);
                        pw.complete(this, [result, objectStore.transaction, e]);
                    },
                        function (args /*error, e*/) {
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Clear error", args);
                            pw.error(this, args);
                        });
                } catch (ex) {
                    var error = internal.wrapException(ex, "clear");

                    if ((ex.READ_ONLY_ERR && ex.code == ex.READ_ONLY_ERR) || ex.name == "ReadOnlyError") {
                        error.type = "ReadOnlyError";
                        error.message = "You are trying to clear data in a readonly transaction.";
                    }

                    if (ex.name == "TransactionInactiveError") {
                        error.type = "TransactionInactiveError";
                        error.message = "You are trying to clear data on an inactieve transaction. (The transaction was already aborted or committed)";
                    }

                    if ((ex.INVALID_STATE_ERR && ex.code == ex.INVALID_STATE_ERR) || (ex.NOT_ALLOWED_ERR && ex.code == ex.NOT_ALLOWED_ERR) || ex.name == "InvalidStateError") {
                        error.type = "InvalidStateError";
                        error.message = "You are trying to clear data on a removed object store.";
                    }

                    linq2indexedDB.prototype.utilities.logError(error);
                    linq2indexedDB.prototype.core.abortTransaction(objectStore.transaction);
                    pw.error(this, error);
                }
            },
            deleteDb: function (pw, name) {
                try {
                    if (typeof (window.indexedDB.deleteDatabase) != "undefined") {

                        handlers.IDBBlockedRequest(window.indexedDB.deleteDatabase(name)).then(function (args /*result, e*/) {
                            var result = args[0];
                            var e = args[1];

                            linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseRemoved });
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Delete Database Promise completed", result, e, name);
                            pw.complete(this, [result, e, name]);
                        }, function (args /*error, e*/) {
                            var error = args[0];
                            var e = args[1];

                            // added for FF, If a db gets deleted that doesn't exist an errorCode 6 ('NOT_ALLOWED_ERR') is given
                            if (e.currentTarget && e.currentTarget.errorCode == 6) {
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseRemoved });
                                pw.complete(this, [error, e, name]);
                            } else if (implementation == implementations.SHIM
                                && e.message == "Database does not exist") {
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseRemoved });
                                pw.complete(this, [error, e, name]);
                            } else {
                                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Delete Database Promise error", error, e);
                                pw.error(this, [error, e]);
                            }
                        }, function (args /*result, e*/) {
                            if (args[0] == "blocked") {
                                linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseBlocked });
                            }
                            linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Delete Database Promise blocked", args /*result*/);
                            pw.progress(this, args /*[result, e]*/);
                        });
                    } else {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Delete Database function not found", name);
                        // Workaround for older versions of chrome and FireFox
                        // Doesn't delete the database, but clears him
                        linq2indexedDB.prototype.core.db(name, -1).then(function (args /*result, e*/) {
                            var result = args[0];
                            var e = args[1];

                            linq2indexedDB.prototype.core.dbStructureChanged.fire({ type: dbEvents.databaseRemoved });
                            pw.complete(this, [result, e, name]);
                        },
                            function (args /*error, e*/) {
                                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.error, "Clear Promise error", args /*error, e*/);
                                pw.error(this, args /*[error, e]*/);
                            },
                            function (args /*dbConnection, event*/) {
                                var dbConnection = args[0];
                                var event = args[1];

                                // When an upgradeneeded event is thrown, create the non-existing object stores
                                if (event.type == "upgradeneeded") {
                                    for (var i = 0; i < dbConnection.objectStoreNames.length; i++) {
                                        linq2indexedDB.prototype.core.deleteObjectStore(dbConnection.txn, dbConnection.objectStoreNames[i]);
                                    }
                                    linq2indexedDB.prototype.core.closeDatabaseConnection(dbConnection);
                                }
                            });
                    }
                } catch (ex) {
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.exception, "Delete Database Promise exception", ex);
                    pw.error(this, [ex.message, ex]);
                }
            },
            getDatabaseVersion: function (db)
            {
                var dbVersion = parseInt(db.version);
                if (isNaN(dbVersion) || dbVersion < 0) {
                    return 0;
                } else {
                    return dbVersion;
                }
            },
            wrapException: function (exception, method) {
                return {
                    code: exception.code,
                    severity: linq2indexedDB.prototype.utilities.severity.exception,
                    orignialError: exception,
                    method: method,
                    type: "unknown"
                };
            },
            wrapError: function (error, method) {
                return {
                    severity: linq2indexedDB.prototype.utilities.severity.error,
                    orignialError: error,
                    type: (error.target && error.target.error && error.target.error.name) ? error.target.error.name : "unknown",
                    method: method
                };
            }
        };

        linq2indexedDB.prototype.core = {
            db: function (name, version) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    internal.db(pw, name, version);
                });
            },
            transaction: function (db, objectStoreNames, transactionType, autoGenerateAllowed) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (db.then) {
                        db.then(function (args /*db, e*/) {
                            // Timeout necessary for letting it work on win8. If not, progress event triggers before listeners are coupled
                            if (isMetroApp) {
                                setTimeout(function () {
                                    internal.transaction(pw, args[0], objectStoreNames, transactionType, autoGenerateAllowed);
                                }, 1);
                            } else {
                                internal.transaction(pw, args[0], objectStoreNames, transactionType, autoGenerateAllowed);
                            }
                        },
                            function (args /*error, e*/) {
                                pw.error(this, args);
                            },
                            function (args /**/) {
                                pw.progress(this, args);
                            });
                    } else {
                        if (isMetroApp) {
                            // Timeout necessary for letting it work on win8. If not, progress event triggers before listeners are coupled
                            setTimeout(function() {
                                internal.transaction(pw, db, objectStoreNames, transactionType, autoGenerateAllowed);
                            }, 1);
                        } else {
                            internal.transaction(pw, db, objectStoreNames, transactionType, autoGenerateAllowed);
                        }
                    }
                });
            },
            objectStore: function (transaction, objectStoreName) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (transaction.then) {
                        transaction.then(function (/*txn, e*/) {
                            // transaction completed
                            // TODO: what todo in this case?
                        }, function (args /*error, e*/) {
                            pw.error(this, args);
                        }, function (args /*txn, e*/) {
                            internal.objectStore(pw, args[0], objectStoreName);
                        });
                    } else {
                        internal.objectStore(pw, transaction, objectStoreName);
                    }
                });
            },
            createObjectStore: function (transaction, objectStoreName, objectStoreOptions) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (transaction.then) {
                        transaction.then(function (/*txn, e*/) {
                            // txn completed
                            // TODO: what todo in this case?
                        },
                            function (args /*error, e*/) {
                                // txn error or abort
                                pw.error(this, args);
                            },
                            function (args /*txn, e*/) {
                                internal.createObjectStore(pw, args[0], objectStoreName, objectStoreOptions);
                            });
                    } else {
                        internal.createObjectStore(pw, transaction, objectStoreName, objectStoreOptions);
                    }
                });
            },
            deleteObjectStore: function (transaction, objectStoreName) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (transaction.then) {
                        transaction.then(function (/*txn, e*/) {
                            // txn completed
                            // TODO: what todo in this case?
                        }, function (args /*error, e*/) {
                            // txn error
                            pw.error(this, args);
                        },
                            function (args /*txn, e*/) {
                                internal.deleteObjectStore(pw, args[0], objectStoreName);
                            });
                    } else {
                        internal.deleteObjectStore(pw, transaction, objectStoreName);
                    }
                });
            },
            index: function (objectStore, propertyName, autoGenerateAllowed) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args /*txn, objectStore*/) {
                            internal.index(pw, args[1], propertyName, autoGenerateAllowed);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.index(pw, objectStore, propertyName, autoGenerateAllowed);
                    }
                });
            },
            createIndex: function (objectStore, propertyName, indexOptions) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args/*txn, objectStore*/) {
                            internal.createIndex(pw, args[1], propertyName, indexOptions);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.createIndex(pw, objectStore, propertyName, indexOptions);
                    }
                });
            },
            deleteIndex: function (objectStore, propertyName) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args/*txn, objectStore*/) {
                            internal.deleteIndex(pw, args[1], propertyName);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.deleteIndex(pw, objectStore, propertyName);
                    }
                });
            },
            cursor: function (source, range, direction) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (source.then) {
                        source.then(function (args /*txn, source*/) {
                            internal.cursor(pw, args[1], range, direction);
                        }, function (args /*error, e*/) {
                            // store or index error
                            pw.error(this, args);
                        });
                    } else {
                        internal.cursor(pw, source, range, direction);
                    }
                });
            },
            keyCursor: function (index, range, direction) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (index.then) {
                        index.then(function (args /*txn, index, store*/) {
                            internal.keyCursor(pw, args[1], range, direction);
                        }, function (args /*error, e*/) {
                            // index error
                            pw.error(this, args);
                        });
                    } else {
                        internal.keyCursor(pw, index, range, direction);
                    }
                });
            },
            get: function (source, key) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (source.then) {
                        source.then(function (args /*txn, source*/) {
                            internal.get(pw, args[1], key);
                        }, function (args /*error, e*/) {
                            // store or index error
                            pw.error(this, args);
                        });
                    } else {
                        internal.get(pw, source, key);
                    }
                });
            },
            count: function (source) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (source.then) {
                        source.then(function (args /*txn, source*/) {
                            internal.count(pw, args[1]);
                        }, function (args /*error, e*/) {
                            // store or index error
                            pw.error(this, args);
                        });
                    } else {
                        internal.count(pw, source);
                    }
                });
            },
            getKey: function (index, key) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (index.then) {
                        index.then(function (args /*txn, index, objectStore*/) {
                            internal.getKey(pw, args[1], key);
                        }, function (args /*error, e*/) {
                            // index error
                            pw.error(this, args);
                        });
                    } else {
                        internal.getKey(pw, index, key);
                    }
                });
            },
            insert: function (objectStore, data, key) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args /*txn, store*/) {
                            internal.insert(pw, args[1], data, key);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.insert(pw, objectStore, data, key);
                    }
                });
            },
            update: function (objectStore, data, key) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args /*txn, store*/) {
                            internal.update(pw, args[1], data, key);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.update(pw, objectStore, data, key);
                    }
                });
            },
            remove: function (objectStore, key) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args /*txn, store*/) {
                            internal.remove(pw, args[1], key);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.remove(pw, objectStore, key);
                    }
                });
            },
            clear: function (objectStore) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    if (objectStore.then) {
                        objectStore.then(function (args /*txn, store*/) {
                            internal.clear(pw, args[1]);
                        }, function (args /*error, e*/) {
                            // store error
                            pw.error(this, args);
                        });
                    } else {
                        internal.clear(pw, objectStore);
                    }
                });
            },
            deleteDb: function (name) {
                return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                    internal.deleteDb(pw, name);
                });
            },
            closeDatabaseConnection: function (target) {
                var db;
                if (target instanceof IDBCursor) {
                    target = target.source;
                }

                if (target instanceof IDBDatabase) {
                    db = target;
                } else if (target instanceof IDBTransaction) {
                    db = target.db;
                } else if (target instanceof IDBObjectStore || target instanceof IDBRequest) {
                    db = target.transaction.db;
                } else if (target instanceof IDBIndex) {
                    db = target.objectStore.transaction.db;
                }

                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Close database Connection: ", db);
                db.close();
            },
            abortTransaction: function (transaction) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Abort transaction: " + transaction);
                // Calling the abort, blocks the database in IE10
                if (implementation != implementations.MICROSOFT) {
                    transaction.abort();
                    linq2indexedDB.prototype.core.closeDatabaseConnection(transaction);
                }
            },
            transactionTypes: transactionTypes,
            dbStructureChanged: new eventTarget(),
            dbDataChanged: new eventTarget(),
            databaseEvents: dbEvents,
            dataEvents: dataEvents,
            implementation: implementation,
            implementations: implementations
        };

        if (implementation == implementations.SHIM) {
            linq2indexedDB.prototype.core.indexSuffix = "IIndex";
        } else {

            linq2indexedDB.prototype.core.indexSuffix = "-Index";
        }

        // Region Functions

        function initializeIndexedDb() {
            if (window === 'undefined') {
                return implementations.NONE;
            }

            if (window.indexedDB) {
                linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Native implementation", window.indexedDB);
                return implementations.NATIVE;
            } else {
                // Initialising the window.indexedDB Object for FireFox
                if (window.mozIndexedDB) {
                    window.indexedDB = window.mozIndexedDB;

                    if (typeof window.IDBTransaction.READ_ONLY === "number"
                        && typeof window.IDBTransaction.READ_WRITE === "number"
                        && typeof window.IDBTransaction.VERSION_CHANGE === "number") {
                        transactionTypes.READ_ONLY = window.IDBTransaction.READ_ONLY;
                        transactionTypes.READ_WRITE = window.IDBTransaction.READ_WRITE;
                        transactionTypes.VERSION_CHANGE = window.IDBTransaction.VERSION_CHANGE;
                    }

                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "FireFox Initialized", window.indexedDB);
                    return implementations.MOZILLA;
                }

                    // Initialising the window.indexedDB Object for Chrome
                else if (window.webkitIndexedDB) {
                    if (!window.indexedDB) window.indexedDB = window.webkitIndexedDB;
                    if (!window.IDBCursor) window.IDBCursor = window.webkitIDBCursor;
                    if (!window.IDBDatabase) window.IDBDatabase = window.webkitIDBDatabase; //if (!window.IDBDatabaseError) window.IDBDatabaseError = window.webkitIDBDatabaseError
                    if (!window.IDBDatabaseException) window.IDBDatabaseException = window.webkitIDBDatabaseException;
                    if (!window.IDBFactory) window.IDBFactory = window.webkitIDBFactory;
                    if (!window.IDBIndex) window.IDBIndex = window.webkitIDBIndex;
                    if (!window.IDBKeyRange) window.IDBKeyRange = window.webkitIDBKeyRange;
                    if (!window.IDBObjectStore) window.IDBObjectStore = window.webkitIDBObjectStore;
                    if (!window.IDBRequest) window.IDBRequest = window.webkitIDBRequest;
                    if (!window.IDBTransaction) window.IDBTransaction = window.webkitIDBTransaction;
                    if (!window.IDBOpenDBRequest) window.IDBOpenDBRequest = window.webkitIDBOpenDBRequest;
                    if (typeof window.IDBTransaction.READ_ONLY === "number"
                        && typeof window.IDBTransaction.READ_WRITE === "number"
                        && typeof window.IDBTransaction.VERSION_CHANGE === "number") {
                        transactionTypes.READ_ONLY = window.IDBTransaction.READ_ONLY;
                        transactionTypes.READ_WRITE = window.IDBTransaction.READ_WRITE;
                        transactionTypes.VERSION_CHANGE = window.IDBTransaction.VERSION_CHANGE;
                    }

                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Chrome Initialized", window.indexedDB);
                    return implementations.GOOGLE;
                }

                    // Initialiseing the window.indexedDB Object for IE 10 preview 3+
                else if (window.msIndexedDB) {
                    window.indexedDB = window.msIndexedDB;

                    transactionTypes.READ_ONLY = 0;
                    transactionTypes.READ_WRITE = 1;
                    transactionTypes.VERSION_CHANGE = 2;

                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "IE10+ Initialized", window.indexedDB);
                    return implementations.MICROSOFT;
                }

                    // Initialising the window.indexedDB Object for IE 8 & 9
                else if (navigator.appName == 'Microsoft Internet Explorer') {
                    try {
                        window.indexedDB = new ActiveXObject("SQLCE.Factory.4.0");
                        window.indexedDBSync = new ActiveXObject("SQLCE.FactorySync.4.0");
                    } catch (ex) {
                        linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Initializing IE prototype exception", ex);
                    }

                    if (window.JSON) {
                        window.indexedDB.json = window.JSON;
                        window.indexedDBSync.json = window.JSON;
                    } else {
                        var jsonObject = {
                            parse: function (txt) {
                                if (txt === "[]") return [];
                                if (txt === "{}") return {};
                                throw { message: "Unrecognized JSON to parse: " + txt };
                            }
                        };
                        window.indexedDB.json = jsonObject;
                        window.indexedDBSync.json = jsonObject;
                    }

                    // Add some interface-level constants and methods.
                    window.IDBDatabaseException = {
                        UNKNOWN_ERR: 0,
                        NON_TRANSIENT_ERR: 1,
                        NOT_FOUND_ERR: 2,
                        CONSTRAINT_ERR: 3,
                        DATA_ERR: 4,
                        NOT_ALLOWED_ERR: 5,
                        SERIAL_ERR: 11,
                        RECOVERABLE_ERR: 21,
                        TRANSIENT_ERR: 31,
                        TIMEOUT_ERR: 32,
                        DEADLOCK_ERR: 33
                    };

                    window.IDBKeyRange = {
                        SINGLE: 0,
                        LEFT_OPEN: 1,
                        RIGHT_OPEN: 2,
                        LEFT_BOUND: 4,
                        RIGHT_BOUND: 8
                    };

                    window.IDBRequest = {
                        INITIAL: 0,
                        LOADING: 1,
                        DONE: 2
                    };

                    window.IDBTransaction = {
                        READ_ONLY: 0,
                        READ_WRITE: 1,
                        VERSION_CHANGE: 2
                    };

                    transactionTypes.READ_ONLY = 0;
                    transactionTypes.READ_WRITE = 1;
                    transactionTypes.VERSION_CHANGE = 2;

                    window.IDBKeyRange.only = function (value) {
                        return window.indexedDB.range.only(value);
                    };

                    window.IDBKeyRange.leftBound = function (bound, open) {
                        return window.indexedDB.range.lowerBound(bound, open);
                    };

                    window.IDBKeyRange.rightBound = function (bound, open) {
                        return window.indexedDB.range.upperBound(bound, open);
                    };

                    window.IDBKeyRange.bound = function (left, right, openLeft, openRight) {
                        return window.indexedDB.range.bound(left, right, openLeft, openRight);
                    };

                    window.IDBKeyRange.lowerBound = function (left, openLeft) {
                        return window.IDBKeyRange.leftBound(left, openLeft);
                    };

                    return implementations.MICROSOFTPROTOTYPE;
                } else if (window.shimIndexedDB) {
                    window.indexedDB = window.shimIndexedDB;

                    return implementations.SHIM;
                } else {
                    linq2indexedDB.prototype.utilities.log(linq2indexedDB.prototype.utilities.severity.information, "Your browser doesn't support indexedDB.");
                    return implementations.NONE;
                }
            }
        };

        function deferredHandler(handler, request) {
            return linq2indexedDB.prototype.utilities.promiseWrapper(function (pw) {
                try {
                    handler(pw, request);
                } catch (e) {
                    e.type = "exception";
                    pw.error(request, [e.message, e]);
                }
                finally {
                    request = null;
                }
            });
        };

        function IDBSuccessHandler(pw, request) {
            request.onsuccess = function (e) {
                pw.complete(e.target, [e.target.result, e]);
            };
        };

        function IDBErrorHandler(pw, request) {
            request.onerror = function (e) {
                pw.error(e.target, [e.target.errorCode, e]);
            };
        };

        function IDBAbortHandler(pw, request) {
            request.onabort = function (e) {
                pw.error(e.target, [e.target.errorCode, e]);
            };
        };

        function IDBVersionChangeHandler(pw, request) {
            request.onversionchange = function (e) {
                pw.progress(e.target, [e.target.result, e]);
            };
        };

        function IDBCompleteHandler(pw, request) {
            request.oncomplete = function (e) {
                pw.complete(e.target, [e.target, e]);
            };
        };

        function IDBRequestHandler(pw, request) {
            IDBSuccessHandler(pw, request);
            IDBErrorHandler(pw, request);
        };

        function IDBCursorRequestHandler(pw, request) {
            request.onsuccess = function (e) {
                if (!e.target.result) {
                    pw.complete(e.target, [e.target.result, e]);
                } else {
                    pw.progress(e.target, [e.target.result, e]);
                }
            };
            IDBErrorHandler(pw, request);
        };

        function IDBBlockedRequestHandler(pw, request) {
            IDBRequestHandler(pw, request);
            request.onblocked = function (e) {
                pw.progress(e.target, ["blocked", e]);
            };
        };

        function IDBOpenDbRequestHandler(pw, request) {
            IDBBlockedRequestHandler(pw, request);
            request.onupgradeneeded = function (e) {
                pw.progress(e.target, [e.target.transaction, e]);
            };
        };

        function IDBDatabaseHandler(pw, database) {
            IDBAbortHandler(pw, database);
            IDBErrorHandler(pw, database);
            IDBVersionChangeHandler(pw, database);
        };

        function IDBTransactionHandler(pw, txn) {
            IDBCompleteHandler(pw, txn);
            IDBAbortHandler(pw, txn);
            IDBErrorHandler(pw, txn);
        };

    })(window, typeof Windows !== "undefined");
    window.linq2indexedDB = linq2indexedDB;

} else {
    // Web Worker Thread
    onmessage = function (event) {
        var data = event.data.data;
        var filtersString = event.data.filters || "[]";
        var sortClauses = event.data.sortClauses || [];
        var filters = JSON.parse(filtersString, linq2indexedDB.prototype.utilities.deserialize);
        var returnData = linq2indexedDB.prototype.utilities.filterSort(data, filters, sortClauses);

        postMessage(returnData);
        return;
    };
}

// Extend array for Opera
//Array.prototype.contains = function (obj) {
//    return this.indexOf(obj) > -1;
//};