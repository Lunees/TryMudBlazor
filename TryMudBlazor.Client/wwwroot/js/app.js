﻿window.App = window.App || (function () {
    return {
        reloadIFrame: function (id, newSrc) {
            const iFrame = document.getElementById(id);
            if (!iFrame) {
                return;
            }

            if (!newSrc) {
                iFrame.contentWindow.location.reload();
            } else if (iFrame.src !== `${window.location.origin}${newSrc}`) {
                iFrame.src = newSrc;
            } else {
                // There needs to be some change so the iFrame is actually reloaded
                iFrame.src = '';
                setTimeout(() => iFrame.src = newSrc);
            }
        },
        changeDisplayUrl: function (url) {
            if (!url) {
                return;
            }

            window.history.pushState(null, null, url);
        },
        copyToClipboard: function (text) {
            if (!text) {
                return;
            }

            const input = document.createElement('textarea');
            input.style.top = '0';
            input.style.left = '0';
            input.style.position = 'fixed';
            input.innerHTML = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
    };
}());

window.App.CodeEditor = window.App.CodeEditor || (function () {
    let _editor;
    let _overrideValue;
    let _currentLanguage;

    return {
        init: function (editorId, value, language) {
            if (!editorId) {
                return;
            }

            require.config({ paths: { 'vs': 'lib/monaco-editor/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                _editor = monaco.editor.create(document.getElementById(editorId), {
                    fontSize: '16px',
                    value: _overrideValue || value || '',
                    language: language || _currentLanguage || 'razor'
                });

                _overrideValue = null;
                _currentLanguage = language || _currentLanguage;
            });
        },
        getValue: function () {
            return _editor && _editor.getValue();
        },
        setValue: function (value, language) {
            if (_editor) {
                _editor.setValue(value || '');
                if (language && language !== _currentLanguage) {
                    monaco.editor.setModelLanguage(_editor.getModel(), language);
                    _currentLanguage = language;
                }

                _editor.setScrollPosition({ scrollTop: 0 });
            } else {
                _overrideValue = value;
                _currentLanguage = language || _currentLanguage;
            }
        },
        setLanguage: function (language) {
            if (!_editor || _currentLanguage === language) {
                return;
            }

            monaco.editor.setModelLanguage(_editor.getModel(), language);
        },
        focus: function () {
            return _editor && _editor.focus();
        },
        resize: function () {
            _editor && _editor.layout();
        },
        dispose: function () {
            _editor = null;
            _overrideValue = null;
            _currentLanguage = null;
        }
    };
}());

window.App.Repl = window.App.Repl || (function () {
    const S_KEY_CODE = 83;

    const throttleLastTimeFuncNameMappings = {};

    let _dotNetInstance;
    let _editorContainerId;
    let _resultContainerId;
    let _editorId;
    let _originalHistoryPushStateFunction;

    function setElementHeight(elementId, excludeTabsHeight) {
        const element = document.getElementById(elementId);
        if (element) {
            const oldHeight = element.style.height;

            // TODO: Abstract class names
            let height =
                window.innerHeight -
                document.getElementsByClassName('repl-navbar')[0].offsetHeight;

            if (excludeTabsHeight) {
                height -= document.getElementsByClassName('tabs-wrapper')[0].offsetHeight;
            }

            document.getElementsByTagName("body")[0].style.overflow = "hidden";

            const heightString = `${height}px`;
            element.style.height = heightString;

            return oldHeight !== heightString;
        }

        return false;
    }

    function initReplSplitter() {
        if (_editorContainerId &&
            _resultContainerId &&
            document.getElementById(_editorContainerId) &&
            document.getElementById(_resultContainerId)) {

            throttleLastTimeFuncNameMappings['resetEditor'] = new Date();
            Split(['#' + _editorContainerId, '#' + _resultContainerId], {
                elementStyle: (_, size, gutterSize) => ({
                    'width': `calc(${size}% - ${gutterSize + 1}px)`,
                }),
                gutterStyle: (_, gutterSize) => ({
                    'width': `${gutterSize - 6}px`,
                }),
                onDrag: () => throttle(window.App.CodeEditor.resize, 30, 'resetEditor'),
                onDragEnd: window.App.CodeEditor.resize
            });
        }
    }

    function onWindowResize() {
        setElementHeight(_resultContainerId, true);
        setElementHeight(_editorContainerId, true);
        window.App.CodeEditor.resize();
    }

    function onKeyDown(e) {
        if (e.ctrlKey && e.keyCode === S_KEY_CODE) {
            e.preventDefault();

            if (_dotNetInstance && _dotNetInstance.invokeMethodAsync) {
                throttle(() => _dotNetInstance.invokeMethodAsync('TriggerCompileAsync'), 1000, 'compile');
            }
        }
    }

    function throttle(func, timeFrame, id) {
        const now = new Date();
        if (now - throttleLastTimeFuncNameMappings[id] >= timeFrame) {
            func();

            throttleLastTimeFuncNameMappings[id] = now;
        }
    }

    function enableNavigateAwayConfirmation() {
        window.onbeforeunload = () => true;

        _originalHistoryPushStateFunction = window.history.pushState;
        window.history.pushState = (originalHistoryPushStateFunction => function () {
            const newUrl = arguments[2] && arguments[2].toLowerCase();
            if (newUrl && (newUrl.endsWith('/snippet') || newUrl.includes('/snippet/'))) {
                return originalHistoryPushStateFunction.apply(this, arguments);
            }

            const navigateAwayConfirmed = confirm('Are you sure you want to leave Mudlazor page? Changes you made may not be saved.');
            return navigateAwayConfirmed
                ? originalHistoryPushStateFunction.apply(this, arguments)
                : null;
        })(window.history.pushState);
    }

    function disableNavigateAwayConfirmation() {
        window.onbeforeunload = null;

        if (_originalHistoryPushStateFunction) {
            window.history.pushState = _originalHistoryPushStateFunction;
        }
    }

    return {
        init: function (editorContainerId, resultContainerId, editorId, dotNetInstance) {
            _dotNetInstance = dotNetInstance;
            _editorContainerId = editorContainerId;
            _resultContainerId = resultContainerId;
            _editorId = editorId;

            throttleLastTimeFuncNameMappings['compile'] = new Date();

            setElementHeight(resultContainerId);
            setElementHeight(editorContainerId, true);

            initReplSplitter();

            window.addEventListener('resize', onWindowResize);
            window.addEventListener('keydown', onKeyDown);

           // enableNavigateAwayConfirmation();
        },
        setCodeEditorContainerHeight: function (newLanguage) {
            setElementHeight(_editorContainerId, true);
            window.App.CodeEditor.setLanguage(newLanguage);
            window.App.CodeEditor.resize();
        },
        updateUserAssemblyInCacheStorage: function (rawFileBytes) {
            if (!rawFileBytes) {
                return;
            }

            const fileBytes = Blazor.platform.toUint8Array(rawFileBytes);
            const response = new Response(
                new Blob([fileBytes]),
                {
                    headers: {
                        'content-length': fileBytes.length.toString(),
                        'content-type': 'application/octet-stream'
                    }
                });

            caches.open('blazor-resources-/').then(function (cache) {
                if (!cache) {
                    // TODO: alert user
                    return;
                }

                cache.keys().then(function (keys) {
                    const keysForDelete = keys.filter(x => x.url.indexOf('UserComponents') > -1);

                    const dll = keysForDelete.find(x => x.url.indexOf('dll') > -1).url.substr(window.location.origin.length);
                    cache.delete(dll).then(function () {
                        cache.put(dll, response).then(function () { });
                    });
                });
            });
        },
        dispose: function () {
            _dotNetInstance = null;
            _editorContainerId = null;
            _resultContainerId = null;
            _editorId = null;

            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('keydown', onKeyDown);

            disableNavigateAwayConfirmation();
        }
    };
}());

window.App.SaveSnippetPopup = window.App.SaveSnippetPopup || (function () {
    let _dotNetInstance;
    let _invokerId;
    let _id;

    function closePopupOnWindowClick(e) {
        if (!_dotNetInstance || !_invokerId || !_id) {
            return;
        }

        let currentElement = e.target;
        while (currentElement.id !== _id && currentElement.id !== _invokerId) {
            currentElement = currentElement.parentNode;
            if (!currentElement) {
                _dotNetInstance.invokeMethodAsync('CloseAsync');
                break;
            }
        }
    }

    return {
        init: function (id, invokerId, dotNetInstance) {
            _dotNetInstance = dotNetInstance;
            _invokerId = invokerId;
            _id = id;

            window.addEventListener('click', closePopupOnWindowClick);
        },
        dispose: function () {
            _dotNetInstance = null;
            _invokerId = null;
            _id = null;

            window.removeEventListener('click', closePopupOnWindowClick);
        }
    };
}());
