
 /**
 * The parsed query
 * @typedef {Object} CamlSql~execOptions
 * @property {CamlSql~ParsedQuery} query - The parsed query to execute
 * @property {function} callback - The callback function
 * @where {Array.<CamlSql~Condition>}
 */ 

function executeSPQuery(options) {
        var spWeb = options.spWeb,
            execCallback = options.callback,
            clientContext,
            spList = null,
            listName = options.query.getListName(),
            spListItems = null,
            viewXml = options && options.rawXml ? options.rawXml : options.query.getXml(),
            nextPage,
            prevPage,
            noCallback = false;

        if (typeof execCallback !== "function") execCallback = null;


        if (!execCallback) {
            noCallback = true;
            execCallback = function(err, rows) {
                if (typeof console !== "undefined") {
                    if (err) console.error(err);
                    if (typeof console.table !== "undefined") {
                        console.table(rows);
                    } else {
                        console.log("[camlsql] Result", rows);
                    }
                }
            }
        }

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {});
            SP.SOD.executeOrDelayUntilScriptLoaded(function() {
                clientContext = SP.ClientContext.get_current();
                if (!spWeb) {
                    spWeb = clientContext.get_web();
                    spList = spWeb.get_lists().getByTitle(listName);
                    if (noCallback && console) console.log("[camlsql] Loading list '" + listName + "'"); 
                    clientContext.load(spList);
                    clientContext.executeQueryAsync(onListLoaded, function () {
                        if (execCallback == null) {
                            throw "[camlsql] Failed to load list";
                        }
                        execCallback({
                            status: "error",
                            message: "Failed to load list",
                            data: {
                                sql: options.query.$options.parsedQuery.query,
                                viewXml: viewXml,
                                listName: listName,
                                error: Array.prototype.slice.call(arguments)
                            }
                        }, null);
                    });

                }
            },"sp.js");

        } else {
            if (noCallback) {
                if (typeof console !== "undefined") {
                    console.log("[camlsql] ViewXML:", options.query.getXml());
                }
            }
            if (execCallback == null) {
                // Output xml and info?
                throw "[camlsql] SP is not defined";
            }
            execCallback({
                status: "error",
                message: "SP is not defined",
                data: null
            }, null);
        }

        function onListLoaded() {
            var camlQuery = new SP.CamlQuery();
            var camlQueryString = options.query.getXml();
            camlQuery.set_viewXml(camlQueryString);
            spListItems = spList.getItems(camlQuery);
            if (noCallback && console) console.log("[camlsql] Executing SP.CamlQuery", camlQueryString); 
            clientContext.load(spListItems);
            clientContext.executeQueryAsync(camlQuerySuccess, function (clientRequest, failedEventArgs) {
                var extraMessage = "";
                if (failedEventArgs) {
                    if (failedEventArgs.get_errorCode() == -2130575340) {
                        extraMessage+= " (Error -2130575340: Check field names)";
                    }
                }

                execCallback({
                    status: "error",
                    message: "Error executing the SP.CamlQuery" + extraMessage,
                    data: {
                        sql: options.query.$options.parsedQuery.query,
                        viewXml: viewXml,
                        listName: listName,
                        error: Array.prototype.slice.call(arguments)
                    }
                }, null);
            });
        }

         function camlQuerySuccess() {
            var listItemEnumerator = spListItems.getEnumerator(),
                items = [],
                spListItem;

            var listItemCollectionPosition = spListItems.get_listItemCollectionPosition();

            if (listItemCollectionPosition) {
                nextPage = listItemCollectionPosition.get_pagingInfo();
            }

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
                }
                items.push(spListItem.get_fieldValues());
            }
            execCallback(null, items, {
                nextPage : nextPage,
                prevPage : prevPage
            });
        }
    }