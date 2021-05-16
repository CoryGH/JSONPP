const objectFilter = new RegExp(/^\s*[a-zA-Z]*\s*\{/);

function bracketPair(left, right) {
    if ((left === '(') && (right === ')')) { return (true); }
    if ((left === '[') && (right === ']')) { return (true); }
    if ((left === '{') && (right === '}')) { return (true); }
    return (false);
}

function escaped(str, index) {
    let ret = false;
    for (let i = index - 1; i >= 0; i--) {
        if (str.substr(i, 1) === '\\') {
            ret = !ret;
        } else { break; }
    }
    return (ret);
}

function getRWProperties(obj) {
    let proto = Object.getPrototypeOf(obj);
    let names = [];
    while ((proto !== null) && (['Object', 'Array', 'Function'].indexOf(proto.constructor.name) < 0)) {
        Array.prototype.splice.apply(names, [names.length, 0].concat(
            Object.getOwnPropertyNames(proto).filter((name) => {
                if (['constructor'].indexOf(name) >= 0) { return (false); }
                let desc = Object.getOwnPropertyDescriptor (proto, name);
                if ((!desc.hasOwnProperty('get')) || (desc.get === undefined)) { return (false); }
                if ((!desc.hasOwnProperty('set')) || (desc.set === undefined)) { return (false); }
                return (names.indexOf(name) < 0);
            })
        ));
        proto = Object.getPrototypeOf(proto);
    }
    return (names);
}

function isObject(json) {
    let trimmed = json.trim();
    let firstBracket = trimmed.indexOf('{');
    if (firstBracket === 0) {
        return ({
            obj: trimmed,
            type: null
        });
    } else if ((firstBracket > 0) && isPalindromic(toBrackets(trimmed.substr(0, firstBracket)))) {
        if (!objectFilter.test(trimmed.substr(0, firstBracket + 1))) { return (false); }
        return ({
            obj: trimmed.substr(firstBracket),
            type: trimmed.substr(0, firstBracket)
        });
    } else {
        return (false);
    }
}

function isPalindromic(subject) {
    let stack = [];

    for (let i = 0; i < subject.length; i++) {
        if (['[', '{', '('].indexOf(subject[i]) >= 0) {
            stack.push(subject[i]);
        } else {
            if (stack.length === 0) {
                return (false);
            }
            let last = stack.pop()
            if (!bracketPair(last, subject[i])) {
                return (false);
            }
        }
    }

    if (stack.length !== 0) {
        return (false);
    }

    return (true);
}

function mirrorOf(left, right) {
    if (left.length !== right.length) { return (false); }
    let j = 0;
    for (let i = left.length - 1; i >= 0; i--) {
        switch (left[i]) {
            case '{':
                if (right[j] !== '}') { return (false); }
                break;
            case '}':
                if (right[j] !== '{') { return (false); }
                break;
            case '[':
                if (right[j] !== ']') { return (false); }
                break;
            case ']':
                if (right[j] !== '[') { return (false); }
                break;
            case '(':
                if (right[j] !== ')') { return (false); }
                break;
            case ')':
                if (right[j] !== '(') { return (false); }
                break;
            case '"':
                if (right[j] !== '"') { return (false); }
                break;
            case "'":
                if (right[j] !== "'") { return (false); }
                break;
        }
        j++;
    }
    return (true);
}

function mirroredWith(history, char) {
    let left = [history[history.length - 1]];
    let right = [char];
    if (mirrorOf(left, right)) {
        return ({
            left: left,
            right: right
        });
    }
    for (let i = (history.length - 2); i >= 0; i -= 2) {
        right.push(left.pop());
        left.splice(0, 0, history.slice(i, i + 2));
        if (mirrorOf(left, right)) {
            return ({
                left: left,
                right: right
            });
        }
    }
    return (false);
}

function parseArray(json, constructorHash, path, paths, linkQueue) {
    if (json.substr(json.length - 1, 1) !== ']') {
        throw 'Invalid JSON++';
    }
    let ret = [];
    let elements = splitOnLevel(json.substr(1, json.length - 2), ',');
    for (let i = 0; i < elements.length; i++) {
        let parts = splitOnLevel(elements[i], ':');
        switch (parts.length) {
            case 1:
                parts[0] = parts[0].trim();
                let objInfo = isObject(parts[0]);
                if ((objInfo !== false) && (objInfo['type'] !== null)) {
                    ret.push(parseValue(objInfo.obj, objInfo.type, constructorHash, path + (path !== '/' ? '/' : '') + '[' + i.toString() + ']', paths, linkQueue));
                } else {
                    ret.push(parseValue(parts[0], undefined, constructorHash, path + (path !== '/' ? '/' : '') + '[' + i.toString() + ']', paths, linkQueue));
                }
                break;
            default:
                throw 'Invalid JSON++';
        }
    }
    paths.push({
        object: ret,
        path: path
    });
    return (ret);
}

function parseObject(json, constructorHash, path, paths, linkQueue) {
    if (json.substr(json.length - 1, 1) !== '}') {
        throw 'Invalid JSON++';
    }
    let ret = { };
    let elements = splitOnLevel(json.substr(1, json.length - 2), ',');
    for (let i = 0; i < elements.length; i++) {
        let parts = splitOnLevel(elements[i], ':');
        switch (parts.length) {
            case 2:
                parts[0] = parts[0].trim();
                parts[1] = parts[1].trim();
                let objInfo = isObject(parts[1]);
                if ((objInfo !== false) && (objInfo['type'] !== null)) {
                    ret[parseValue(parts[0], undefined, constructorHash, path + (path !== '/' ? '/' : '') + parts[0], paths, linkQueue)] = parseValue(objInfo.obj, objInfo.type, constructorHash, path + (path !== '/' ? '/' : '') + parts[0], paths, linkQueue);
                } else {
                    ret[parseValue(parts[0], undefined, constructorHash, path + (path !== '/' ? '/' : '') + parts[0], paths, linkQueue)] = parseValue(parts[1], undefined, constructorHash, path + (path !== '/' ? '/' : '') + parts[0], paths, linkQueue);
                }
                break;
            default:
                throw 'Invalid JSON++';
        }

    }
    paths.push({
        object: ret,
        path: path
    });
    return (ret);
}

function parseValue(value, type, constructorHash, path, paths, linkQueue) {
    let ret = undefined;
    if ((type !== undefined) && (constructorHash !== undefined) && (constructorHash.hasOwnProperty(type))) {
        let newSettings = _parse(value, constructorHash, path, paths, linkQueue);
        if (newSettings instanceof Array) {
            ret = new constructorHash[type](...newSettings);
        } else {
            ret = new constructorHash[type](newSettings);
        }
        paths.push({
            object: ret,
            path: path
        });
        return (ret);
    }
    let trimmed = value.trim();
    if (trimmed === 'null') { return (null); }
    if (trimmed === 'undefined') { return (undefined); }
    let start = trimmed.substr(0, 1);
    if (start === '{') {
        return (ret = parseObject(trimmed, constructorHash, path, paths, linkQueue));
    } else if (start === '[') {
        return (parseArray(trimmed, constructorHash, path, paths, linkQueue));
    } else if (start === '/') {
        for (let i = paths.length - 1; i >= 0; i--) {
            if (trimmed === paths[i].path) { return (paths[i].object); }
        }
        linkQueue.push({
            path: path,
            pointer: trimmed
        });
        return (trimmed);
    }
    let end = trimmed.substr(trimmed.length - 1, 1);
    if ((["'", '"'].indexOf(start) >= 0) && (start === end)) {
        return (trimmed.substr(1, trimmed.length - 2));
    }
    if (!isNaN(trimmed)) {
        if (trimmed.indexOf('.') >= 0) {
            return (parseFloat(trimmed));
        } else {
            return (parseInt(trimmed));
        }
    }
    let parts = splitOnLevel(trimmed, '=>');
    if (parts.length === 2) {
        parts[0] = parts[0].trim();
        parts[1] = parts[1].trim();
        let left = parts[0].trim();
        if ((left.substr(0, 1) !== '(') || (left.substr(left.length - 1, 1) !== ')')) {
            throw 'Invalid JSON++ lambda value';
        }
        left = splitOnLevel(left.substr(1, left.length - 2), ',');
        for (let i = left.length - 1; i >= 0; i--) {
            left[i] = left[i].trim();
        }
        let right = parts[1].trim();
        if (right.substr(0, 1) !== '{') {
            right = '{ return (' + right + '); }';
        }
        parts = left.concat(right);
        ret = new Function(...parts);
        paths.push({
            object: ret,
            path: path
        });
        return (ret);
    }
    throw 'Unknown JSON++ value: "' + trimmed + '"';

}

function splitOnLevel(str, splitOn) {
    let ret = [];
    let history = [];
    let start = 0;
    let inString = false;
    let splitChar = splitOn.substr(0, 1);
    for (let i = 0; i < str.length; i++) {
        let char = str.substr(i, 1);
        switch (char) {
            case '(':
            case ')':
            case '[':
            case ']':
            case '{':
            case '}':
                if (inString === false) {
                    history.push(char);
                }
                break;
            case "'":
            case '"':
                if (inString === char) {
                    if (!escaped(str, i)) {
                        inString = false;
                    }
                } else if (inString === false) {
                    inString = char;
                }
                //history.push(char);
                break;
            case splitChar:
                if (inString === false) {
                    if ((splitOn.length < 2) || (str.substr(i, splitOn.length) === splitOn)) {
                        if (isPalindromic(history)) {
                            ret.push(str.substr(start, i - start));
                            history = [];
                            start = i + splitOn.length;
                        }
                    }
                }
                break;
        }
    }
    ret.push(str.substr(start, str.length - start));
    return (ret);
}

function renderElements(elements, space, forceMultiline, level) {
    if (space === undefined) {
        return (elements.join(','));
    } else {
        if (elements.length > 0) {
            if (forceMultiline || renderMultiline(elements, space)) {
                elements = '\r\n' + repeat(space, level + 1) + elements.join(',\r\n' + repeat(space, level + 1));
                return (' ' + elements + '\r\n' + repeat(space, level));
            } else {
                return (' ' + elements.join(', ') + ' ');
            }
        }
    }
}

function renderMultiline(elements, space) {
    let joined = elements.join(space === undefined ? ',' : ', ');
    if (joined.length > 80) { return (true); }
    for (let i = elements.length - 1; i >= 0; i--) {
        if (elements[i].indexOf('\n') >= 0) { return (true); }
    }
    return (false);
}

function repeat(str, times) {
    let ret = '';
    for (let i = 0; i < times; i++) {
        ret += str;
    }
    return (ret);
}

function toBrackets(str) {
    let ret = [];
    let inString = false;
    for (let i = 0; i < str.length; i++) {
        let char = str.substr(i, 1);
        switch (char) {
            case '(':
            case ')':
            case '[':
            case ']':
            case '{':
            case '}':
                if (inString === false) {
                    ret.push(char);
                }
                break;
            case "'":
            case '"':
                if (inString === char) {
                    if (!escaped(str, i)) {
                        inString = false;
                    }
                } else if (inString === false) {
                    inString = char;
                }
                break;
        }
    }
    return (ret);
}

function _parse(json, constructorHash, path, paths, linkQueue) {
    json = json.trim();
    let arrayMode = (json.substr(0, 1) === '[');
    let ret = undefined;
    if (arrayMode) {
        ret = parseArray(json, constructorHash, path, paths, linkQueue);
    } else {
        let obj = isObject(json);
        if (obj === false) {
            throw 'Invalid JSON++ root object';
        } else {
            if (obj.type !== null) {
                ret = parseObject(obj.obj, constructorHash, path, paths, linkQueue);
            } else {
                ret = parseValue(obj.obj, obj.type, constructorHash, path, paths, linkQueue);
            }
        }
    }
    return (ret);
}

function _set(obj, path, value) {
    let parts = splitOnLevel(path, '/');
    let node = obj;
    let props = getRWProperties(obj);
    parts.shift();
    while (parts.length > 0) {
        let trimmed = parts.shift().trim();
        let start = trimmed.substr(0, 1);
        let id = undefined;
        switch (start) {
            case '"':
                id = trimmed.substr(1, trimmed.length - 2);
                if (!node.hasOwnProperty(id)) {
                    if (props.indexOf(id) < 0) {
                        throw 'Linking failed: path `' + path + '` does not exist'
                    }
                }
                break;
            case '[':
                id = parseInt(trimmed.substr(1, trimmed.length - 2));
                if (!node.hasOwnProperty(id)) {
                    if (props.indexOf(id) < 0) {
                        throw 'Linking failed: path `' + path + '` does not exist'
                    }
                }
                break;
        }
        if (id !== undefined) {
            if (parts.length < 1) {
                node[id] = value;
            } else {
                node = node[id];
            }
            props = getRWProperties(node);
        }
    }
}

function _stringify(obj, replacer, space, forceMultiline, level, path, paths) {
    let ret = '';
    for (let i = paths.length - 1; i >= 0; i--) {
        if (paths[i].object === obj) {
            return (paths[i].path);
        }
    }
    if (obj === null) {
        ret += 'null';
    } else if (obj === undefined) {
        ret += 'undefined';
    } else if (obj instanceof Function) {
        paths.push({
            object: obj,
            path: path
        });
        let temp = obj.toString();
        if (temp.substr(0, 9) === 'function ') {
            ret += temp.substr(9).replace(') {', ') => {');
        } else {
            temp = temp.split(' => ');
            if (temp[0].substr(0, 1) === '(') {
                ret += temp[0] + ' => ';
                temp.shift();
            } else {
                ret += '(' + temp[0] + ') => ';
                temp.shift();
            }
            temp = temp.join(' => ');
            ret += temp;
        }
    } else if (obj instanceof Array) {
        paths.push({
            object: obj,
            path: path
        });
        ret += '[';
        let elements = [];
        for (let i = 0; i < obj.length; i++) {
            elements.push(_stringify(obj[i], replacer, space, forceMultiline, level + 1, path + (path !== '/' ? '/' : '') + i.toString(), paths));
        }
        ret += renderElements(elements, space, forceMultiline.array, level);
        ret += ']';
    } else if (obj instanceof Object) {
        paths.push({
            object: obj,
            path: path
        });
        let type = obj.constructor.name;
        let elements = [];
        if (['Object', 'Array', 'Function'].indexOf(type) < 0) {
            ret += type + (space !== undefined ? ' ' : '');
            ret += '{';
            let properties = getRWProperties(obj);
            for (let j = properties.length - 1; j >= 0; j--) {
                elements.push('"' + properties[j].toString() + '":' + (space !== undefined ? ' ' : '') + _stringify(obj[properties[j]], replacer, space, forceMultiline, level + 1, path + (path !== '/' ? '/' : '') + '"' + properties[j].toString() + '"', paths));
            }
            ret += renderElements(elements, space, forceMultiline.class, level);
            ret += '}';
        } else {
            ret += '{';
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    elements.push('"' + key.toString() + '":' + (space !== undefined ? ' ' : '') + _stringify(obj[key], replacer, space, forceMultiline, level + 1, path + (path !== '/' ? '/' : '') + '"' + key.toString() + '"', paths));
                }
            }
            ret += renderElements(elements, space, forceMultiline.object, level);
            ret += '}';
        }
    } else {
        if (isNaN(obj)) {
            ret += '"' + obj.toString() + '"';
        } else {
            ret += obj.toString();
        }
    }
    return (ret);
}

exports.parse = function (json, constructorHash) {
    let paths = [];
    let linkQueue = [];
    let ret = _parse(json, constructorHash, '/', paths, linkQueue);
    for (let i = linkQueue.length - 1; i >= 0; i--) {
        let obj = undefined;
        for (let j = paths.length - 1; j >= 0; j--) {
            if (paths[j].path === linkQueue[i].pointer) {
                _set(ret, linkQueue[i].path, paths[j].object);
            }
        }
    }
    return (ret);
};

exports.stringify = function (obj, replacer, space, forceMultiline) {
    if (space !== undefined) {
        if (!isNaN(space)) {
            if (space > 10) {
                space = '          ';
            } else if (space < 1) {
                space = undefined;
            } else {
                space = repeat(' ', space);
            }
        } else {
            if (space.length > 0) {
                space = space.substr(0, 10);
            }
        }
    }
    if (forceMultiline === true) {
        forceMultiline = {
            array: true,
            class: true,
            function: true,
            object: true
        };
    } else if ((forceMultiline === undefined) || (forceMultiline === false) || (forceMultiline === null)) {
        forceMultiline = {
            array: false,
            class: false,
            function: false,
            object: false
        };
    } else {
        if (!forceMultiline.hasOwnProperty('array')) {
            forceMultiline.array = false;
        }
        if (!forceMultiline.hasOwnProperty('function')) {
            forceMultiline.function = false;
        }
        if (!forceMultiline.hasOwnProperty('object')) {
            forceMultiline.object = false;
        }
        if (!forceMultiline.hasOwnProperty('class')) {
            forceMultiline.class = forceMultiline.object;
        }
    }
    return (_stringify(obj, replacer, space, forceMultiline, 0, '/', []));
};