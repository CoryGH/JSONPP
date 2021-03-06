# JSON++

- [Objective](#objective)
- [Additional Features](#additional-features)
    - [Circular and Object References](#circular-and-object-references)
    - [Collections](#collections)
    - [Lambdas](#lambdas)
    - [Root Level Arrays](#root-level-arrays)
    - [Type Preservation](#type-preservation)
- [Usage](#usage)
    - [Methods](#methods)
        - [parse(jsonpp[, constructorHash={}])](#parsejsonpp-constructorhash)
        - [stringify(obj[, replacer=undefined[, space=undefined[, forceMultiline=false]]])](#stringifyobj-replacerundefined-spaceundefined-forcemultilinefalse)

## Objective

The objective of this project is to provide a practical implementation of JSON parsing and stringification with added functionality and versatility over the JSON standard while maintaining backwards compatibility for parsing of standard JSON.

## Additional Features

### Circular and Object References

JSON++ handles circular object references by reducing all references to the same object to a path-based identifier representing the definition of that object.

    let obj1 = {
        foo: 'bar'
    };
    let obj2 = {
        baz: obj1
    };
    obj1.qux = obj2;
    obj1.quux = obj2;
    console.log(JSONPP.stringify(obj1, undefined, 4, true));

Produces:

    {
        "foo": "bar",
        "qux": {
            "baz": /
        },
        "quux": /"qux"
    }

as well as the following for arrays:

    let obj1 = {
        foo: ['bar']
    };
    let obj2 = {
    baz: obj1
    };
    obj1.foo.push(obj2);
    obj1.qux = obj2;
    console.log(JSONPP.stringify([obj1], undefined, 4, true));

&nbsp;

    [
        {
            "foo": [
                "bar",
                {
                    "baz": /0
                }
            ],
            "qux": /0/"foo"/1
        }
    ]

### Collections

JSON++ supports object-level attributes/array-elements as extensions of an `Array` class.  This can be demonstrated with the following code:

    class Foo extends Array {
        constructor(settings) {
            super();
            this._bar = (settings.hasOwnProperty('Bar') ? settings['Bar'] : 'bar');
        }
        
        get Bar() {
            return (this._bar);
        }
        set Bar(value) {
            this._bar = value;
        }
    }
    
    let foo = new Foo({ });
    foo.push('1');
    foo.push(2);
    foo.push('3');
    console.log(JSONPP.stringify(foo, undefined, 4, true));

will yield:

    Foo {
        "Bar": "bar"
    }[
        "1",
        2,
        "3"
    ]

which can be in turn deserialized with:

    let foo = JSONPP.parse('Foo{"Bar":"bar"}["1",2,"3"]', {
        Foo: Foo
    });

### Lambdas

Contextless lambda expressions are supported within this library, for example:

    console.log(JSONPP.stringify({
        add: function (left, right) {
            return (left + right);
        {
    }));

will produce:

    {
        "add": (left, right) => {
            return (left + right);
        }
    }

and translate back to the original object via `JSONPP.parse()`.

Valid JSON++ lambda formats are as follows:

    (foo) => { return (foo + 1); }

&nbsp;

    (foo) => foo + 1

&nbsp;

    foo => { return (foo + 1); }

&nbsp;

    foo => foo + 1

### Root Level Arrays

This JSON interpreter allows for root-level arrays, for example:

    console.log(JSONPP.stringify([
        {
            name: 'foo'
        },
        {
            name: 'bar'
        }
    ], undefined, 4, true));

will yield:

    [
        {
            "name": "foo"
        },
        {
            "name": "bar"
        }
    ]

and will translate back to the original array via `JSON.parse()`.

### Type Preservation

Type preservation is possible assuming definitions of types exist on the `parse` end of the data, otherwise `Object` instantiation will occur as normal JSON would.  Example:

    class Foo {
		constructor(settings) {
    		this._bar = (settings.hasOwnProperty('Baz') ? settings['Baz'] : 'baz');
        }
        
        get Bar() { return (this._bar); }
        set Bar(value) { this._bar = value; }
    }
    
    class Baz extends Foo {
        constructor(settings) {
            super(settings);
            this._qux = (settings.hasOwnProperty('Qux') ? settings['Qux'] : 'qux');
            this._quux = (settings.hasOwnProperty('Quux') ? settings['Quux'] : 'quux');
        }
    
        get Qux() { return (this._qux); }
        set Qux(value) { this._qux = value; }
        
        get Quux() { return (this._quux); }
        set Quux(value) { this._quux = value; }
    }
    
    let baz = {
        baz: new Baz({ })
    };
    console.log(exports.stringify(baz, undefined, 4, true));

Produces:

    {
        "baz": Baz {
            "Bar": "baz",
            "Quux": "quux",
            "Qux": "qux"
        }
    }

Which translates back into an instance of `Baz` via:

    console.log(exports.parse(exports.stringify(baz), {
        Foo: Foo,
        Baz: Baz
    }));

To yield:

    {
        "baz": new Baz({
            "Bar":"baz",
            "Quux":"quux",
            "Qux":"qux"
        })
    }

## Usage

Via NPM:

    npm install --save jsonplusplus

Then within node.js:

    const JSONPP = require('jsonplusplus');

### Methods

### parse(jsonpp[, constructorHash={}])

The `parse` function deserializes a JSON++ string.

##### _arguments_

_jsonpp_

The first argument (`jsonpp`) to the `parse` function is the string of JSON++ to be deserialized.

[_constructorHash_]

The optional `constructorHash` argument to the `parse` function is the second argument and when included acts as a non-`Object` type mapping from JSON++ to code, for example:

    {
        "Foo": Foo
    }

would define a `Foo` type (key) which points to the `Foo` class (value) in-code.  The translated object is typically passed as a `settings` `Object` to the constructor of the type being mapped.

### stringify(obj[, replacer=undefined[, space=undefined[, forceMultiline=false[, classInternals=false[, classExternals=true]]]]])

The `stringify` function serializes into a JSON++ string.

##### _arguments_

_obj_

The `Array`, `Object`, or `Class` instance to be serialized.

_replacer_

The replacer argument may be an object of settings defined by their argument names.  `JSON.parse` style `replacer` hook taking `(key, value)` arguments to filter elements being saved.

_space_

The optional `space` argument may be a `String` up to 10 characters or a `Number` denoting the number of spaces to indent with.  When `space` is `undefined` no whitespace will be utilized outside of names and values.

_forceMultiline_

`forceMultiline` is an optional argument to `stringify` which will override the rule of putting `Object` and `Array` bodies totalling under 80 characters with whitespace on the same line.  `forceMultiline` may be `false`|`undefined` to remain disabled, `true` to be enabled, or take an object with one or more of the properties which follow:

    {
        array: true,
        class: true,
        function: true,
        object: true
    }

If `forceMultiline.class` is `undefined` then `forceMultiline.object` will fill the value for it, the default value otherwise is `false`.

_classInternals_

Default: `false`.  If set to `true` internally-defined class member properties are included in the output.

    class Foo {
        constructor(settings) {
            this._bar = (settings.hasOwnProperty('Baz') ? settings['Baz'] : 'baz');
        }
        
        get Bar() { return (this._bar); }
        set Bar(value) { this._bar = value; }
    }
    
    let foo = new Foo({ });
    
    console.log(JSONPP.stringify(foo, {
        replacer: undefined,
        space: 4,
        forceMultiline: true,
        classInternals: true,
        classExternals: false
    }));

produces:

    Foo {
        "_bar": "baz"
    }

_classExternals_

Default: `true`.  If set to `true` class member properties with getters and setters are included in the output.

    class Foo {
        constructor(settings) {
            this._bar = (settings.hasOwnProperty('Baz') ? settings['Baz'] : 'baz');
        }
        
        get Bar() { return (this._bar); }
        set Bar(value) { this._bar = value; }
    }
    
    let foo = new Foo({ });
    
    console.log(JSONPP.stringify(foo, {
        replacer: undefined,
        space: 4,
        forceMultiline: true,
        classInternals: false,
        classExternals: true
    }));

produces:

    Foo {
        "Bar": "baz"
    }

May be combined with `classInternals` as in:

    class Foo {
        constructor(settings) {
            this._bar = (settings.hasOwnProperty('Baz') ? settings['Baz'] : 'baz');
        }
        
        get Bar() { return (this._bar); }
        set Bar(value) { this._bar = value; }
    }
    
    let foo = new Foo({ });
    
    console.log(JSONPP.stringify(foo, {
        replacer: undefined,
        space: 4,
        forceMultiline: true,
        classInternals: true,
        classExternals: true
    }));

to yield:

    Foo {
        "_bar": "baz",
        "Bar": "baz"
    }