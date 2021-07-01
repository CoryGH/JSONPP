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
            type: trimmed.substr(0, firstBracket).trim()
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

function parseObject(json, type, constructorHash, path, paths, linkQueue) {
    let ret = { };
    let coreParts = splitOnLevel(splitOnLevel(json, ' ').join(''), '}[');
    if (coreParts.length < 3) {
        if (coreParts.length > 1) {
            coreParts[0] += '}';
            coreParts[0] = coreParts[0].trim();
            ret = [];
        }
        if (coreParts[0].substr(coreParts[0].length - 1, 1) !== '}') {
            throw 'Invalid JSON++';
        }
        let elements = splitOnLevel(coreParts[0].substr(1, coreParts[0].length - 2), ',');
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
    } else {
        throw 'Invalid JSON++ object';
    }
    if ((type !== undefined) && (constructorHash !== undefined) && (constructorHash.hasOwnProperty(type))) {
        if (ret instanceof Array) {
            ret = new constructorHash[type](...ret);
        } else {
            ret = new constructorHash[type](ret);
        }
    }
    if (coreParts.length === 2) {
        coreParts[1] = '[' + coreParts[1].trim();
        let arrayValues = parseArray(coreParts[1], constructorHash, path, paths, linkQueue);
        Array.prototype.splice.apply(ret, [0, ret.length].concat(arrayValues));
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
        return (ret = parseObject(trimmed, undefined, constructorHash, path, paths, linkQueue));
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
        while ((right.substr(0, 1) === '{') && (right.length > 1)) {
            right = right.substr(1, right.length - 2).trim();
        }
        if (right === parts[1].trim()) {
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

function _splitOnLevelSplitCharCheck(inString, splitOn, str, ret, i, history, start) {
    if (inString === false) {
        if ((splitOn.length < 2) || (str.substr(i, splitOn.length) === splitOn)) {
            if (isPalindromic(history)) {
                ret.push(str.substr(start, i - start));
                history.splice(0, history.length);
                return (i + splitOn.length);
            }
        }
    }
    return (start);
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
            case '[':
            case '{':
                if (char === splitChar) {
                    start = _splitOnLevelSplitCharCheck(inString, splitOn, str, ret, i, history, start);
                }
                if (inString === false) {
                    history.push(char);
                }
                break;
            case ')':
            case ']':
            case '}':
                if (inString === false) {
                    history.push(char);
                }
                if (char === splitChar) {
                    start = _splitOnLevelSplitCharCheck(inString, splitOn, str, ret, i, history, start);
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
            case splitChar:
                start = _splitOnLevelSplitCharCheck(inString, splitOn, str, ret, i, history, start);
                break;
        }
    }
    ret.push(str.substr(start, str.length - start));
    return (ret);
}

function renderElements(elements, space, forceMultiline, level) {
    if ((space === undefined) || (space === null) || (space.length < 1)) {
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
    let joined = elements.join((space === undefined) || (space === null) || (space.length < 1) ? ',' : ', ');
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
                ret = parseObject(obj.obj, obj.type, constructorHash, path, paths, linkQueue);
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

function stringifyArray(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
    let elements = [];
    let ret = '[';
    for (let i = 0; i < obj.length; i++) {
        let newPath = path + (path !== '/' ? '/' : '') + i.toString();
        if ((replacer === undefined) || replacer(i, obj[i], newPath)) {
            elements.push(_stringify(obj[i], replacer, space, forceMultiline, classInternals, classExternals, level + 1, newPath, paths));
        }
    }
    ret += renderElements(elements, space, forceMultiline.array, level);
    ret += ']';
    return (ret);
}

function stringifyClass(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
    let elements = [];
    let ret = type + ((space !== undefined) && (space !== null) && (space.length > 0) ? ' ' : '');
    ret += '{';
    if (classInternals) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let newPath = path + (path !== '/' ? '/' : '') + '"' + key.toString() + '"';
                if ((replacer === undefined) || replacer(key, obj[key], newPath)) {
                    elements.push('"' + key.toString() + '":' + ((space !== undefined) && (space !== null) && (space.length > 0) ? ' ' : '') + _stringify(obj[key], replacer, space, forceMultiline, classInternals, classExternals, level + 1, newPath, paths));
                }
            }
        }
    }
    if (classExternals) {
        let properties = getRWProperties(obj);
        for (let j = properties.length - 1; j >= 0; j--) {
            let newPath = path + (path !== '/' ? '/' : '') + '"' + properties[j].toString() + '"';
            if ((replacer === undefined) || replacer(j, obj[properties[j]], newPath)) {
                elements.push('"' + properties[j].toString() + '":' + ((space !== undefined) && (space !== null) && (space.length > 0) ? ' ' : '') + _stringify(obj[properties[j]], replacer, space, forceMultiline, classInternals, classExternals, level + 1, newPath, paths));
            }
        }
    }
    ret += renderElements(elements, space, forceMultiline.class, level);
    ret += '}';
    return (ret);
}

function codeIsMultiStatement(code) {
    return (code.indexOf(';') >= 0);
}

function stringifyCode(obj, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
    let ret = obj.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let multiStatement = false;
    if ((space !== undefined) && (space !== null) && (space.length > 0)) {
        let codeLevel = level + 1;
        for (let i = 0; i < ret.length; i++) {
            let temp = ret[i].trim();
            let bracketStop = 0;
            if ((i === (ret.length - 1)) && (temp.length === 0)) { codeLevel--; }
            else {
                for (let j = 0; j < temp.length; j++) {
                    if (['}', ']', ')'].indexOf(temp.substr(j, 1)) < 0) { break; }
                    bracketStop++;
                    codeLevel--;
                }
            }
            ret[i] = space.repeat(codeLevel) + ret[i].trim();
            codeLevel += bracketStop;
            let brackets = toBrackets(ret[i]);
            for (let j = brackets.length - 1; j >= 0; j--) {
                if (['{', '[', '('].indexOf(brackets[j]) >= 0) {
                    codeLevel++;
                } else if (['}', ']', ')'].indexOf(brackets[j]) >= 0) {
                    codeLevel--;
                }
            }
        }
        ret = ret.join('\n');
        multiStatement = codeIsMultiStatement(ret);
        return ((multiStatement ? '{' : '') + ret + (multiStatement ? '}' : ''));
    } else {
        //  remove comments and newlines
        for (let i = ret.length - 1; i >= 0; i--) {
            ret[i] = ret[i].trim();
        }
        ret = ret.join('');
        multiStatement = codeIsMultiStatement(ret);
        return ((multiStatement ? '{' : '') + ret + (multiStatement ? '}' : ''));
    }
}

function stringifyFunction(obj, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
    let ret = '';
    let fnBody = obj.toString();
    if (fnBody.substr(0, 9) === 'function ') {
        if (fnBody.substr(9, 9) === 'anonymous') {
            ret += fnBody.substr(18);
        } else {
            ret += fnBody.substr(9);
        }
        ret = ret.split(')');
        ret[0] = ret[0].split(',');
        for (let i = ret[0].length - 1; i >= 0; i--) {
            ret[0][i] = ret[0][i].trim();
        }
        if ((space === null) || (space === undefined) || (space.length < 1)) {
            ret[0] = ret[0].join(',');
        } else {
            ret[0] = ret[0].join(', ');
        }
        ret = ret.join(')');
        ret = ret.replace(') {', ') => {');
        if (ret.substr(0, 1) !== '(') {
            ret = ret.split('(');
            ret.shift();
            ret = '(' + ret.join('(');
        }
        fnBody = ret.split(') => {');
        let temp = ret.substr(fnBody[0].length + 6, ret.length - fnBody[0].length - 6);
        temp = temp.trimEnd();
        if (temp.substr(temp.length - 1, 1) === '}') {
            temp = temp.substr(0, temp.length - 1);
        }
        ret = fnBody[0] + ') => ' + stringifyCode(temp, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
    } else {
        fnBody = fnBody.split(' => ');
        if (fnBody[0].substr(0, 1) === '(') {
            ret += fnBody[0] + ' => ';
            fnBody.shift();
        } else {
            ret += '(' + fnBody[0] + ') => ';
            fnBody.shift();
        }
        fnBody = fnBody.join(') => {');
        fnBody = fnBody.trim();
        if (fnBody.substr(0, 1) === '{') {
            fnBody = fnBody.substr(1, fnBody.length - 1);
        }
        if (fnBody.substr(fnBody.length - 1, 1) === '}') {
            fnBody = fnBody.substr(0, fnBody.length - 1);
        }
        ret += stringifyCode(fnBody, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
    }
    return (ret);
}

function stringifyObject(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
    let elements = [];
    let ret = '{';
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            let newPath = path + (path !== '/' ? '/' : '') + '"' + key.toString() + '"';
            if ((replacer === undefined) || replacer(key, obj[key], newPath)) {
                elements.push('"' + key.toString() + '":' + ((space !== undefined) && (space !== null) && (space.length > 0) ? ' ' : '') + _stringify(obj[key], replacer, space, forceMultiline, classInternals, classExternals, level + 1, newPath, paths));
            }
        }
    }
    ret += renderElements(elements, space, forceMultiline.object, level);
    ret += '}';
    return (ret);
}

function _stringify(obj, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths) {
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
        ret += stringifyFunction(obj, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
    } else if (obj instanceof Array) {
        paths.push({
            object: obj,
            path: path
        });
        let type = obj.constructor.name;
        if (type !== 'Array') {
            ret += stringifyClass(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
            let forceMultilineOverride = {
                array: forceMultiline.array || forceMultiline.class,
                class: forceMultiline.class,
                function: forceMultiline.function,
                object: forceMultiline.object
            };
            ret += stringifyArray(obj, type, replacer, space, forceMultilineOverride, classInternals, classExternals, level, path, paths);
        } else {
            ret += stringifyArray(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
        }
    } else if (obj instanceof Object) {
        paths.push({
            object: obj,
            path: path
        });
        let type = obj.constructor.name;
        if (['Object', 'Array', 'Function'].indexOf(type) < 0) {
            ret += stringifyClass(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
        } else {
            ret += stringifyObject(obj, type, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
        }
    } else {
        try {
            if (isNaN(obj) || (obj === obj.toString())) {
                ret += '"' + obj.toString() + '"';
            } else {
                ret += obj.toString();
            }
        } catch (ex) {
            ret += stringifyObject(new Object(obj), null, replacer, space, forceMultiline, classInternals, classExternals, level, path, paths);
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

exports.stringify = function (obj, replacer, space, forceMultiline, classInternals, classExternals) {
    if (replacer !== undefined) {
        if ((replacer instanceof Object) && (!(replacer instanceof Function))) {
            space = replacer.space;
            forceMultiline = replacer.forceMultiline;
            classInternals = replacer.classInternals;
            classExternals = replacer.classExternals;
            replacer = replacer.replacer;
        }
        if (!(replacer instanceof Function)) { replacer = undefined; }
    }
    if ((space !== undefined) && (space !== null)) {
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
    } else { space = ''; }
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
    classInternals = (classInternals === true);
    classExternals = (classExternals !== false);
    return (_stringify(obj, replacer, space, forceMultiline, classInternals, classExternals, 0, '/', []));
};
