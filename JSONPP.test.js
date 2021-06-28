let JSONPP = require('./JSONPP.js');

describe('JSONPP', () => {
    it('should work with multiple stringify/parse calls', () => {
        let foo = {
            bar: (baz) => { return (baz + 1); }
        };
        let bar = JSONPP.stringify(foo);
        let baz = JSONPP.parse(bar);
        let check = JSONPP.stringify(baz);
        let test = '{"bar":(baz\n) => {\n{\n        return baz + 1;\n      }\n}}';
        expect(check).toBe(test);
    });
});
describe('JSONPP.parse', () => {
    it('should work with root object', () => {
        let test = '{"foo":"bar"}';
        let check = JSONPP.parse(test);
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo).toBe('bar');
    });
    it('should work with null', () => {
        let test = '{"foo":null}';
        let check = JSONPP.parse(test);
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo).toBeNull();
    });
    it('should work with undefined', () => {
        let test = '{"foo":undefined}';
        let check = JSONPP.parse(test);
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo).toBeUndefined();
    });
    it('should work with typed objects', () => {
        class Foo {
            constructor() {
                this._bar = "baz";
            }
        }
        let test = '{"foo":Foo{"_bar":"baz"}}';
        let check = JSONPP.parse(test, {
            Foo: Foo
        });
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo).toBeInstanceOf(Foo);
    });
    it('should work with root array', () => {
        let test = '["foo","bar"]';
        let check = JSONPP.parse(test);
        expect(check instanceof Array).toBeTruthy();
        expect(check.length).toBe(2);
        expect(check[0]).toBe('foo');
        expect(check[1]).toBe('bar');
    });
    it('should work with lambdas', () => {
        let test = '[(left, right) => { return (left + right); }]';
        let check = JSONPP.parse(test);
        expect(check instanceof Array).toBeTruthy();
        expect(check.length).toBe(1);
        expect(check[0](1, 2)).toBe(3);
    });
    it('should work with collections', () => {
        class A extends Array {
            constructor(settings) {
                super();
                this._foo = 'foo';
            }

            get Foo() {
                return (this._foo);
            }
            set Foo(value) {
                this._foo = value;
            }
        }
        let test = 'A {\n' +
            '    "Foo": "foo"\n' +
            '}[\n' +
            '    "1",\n' +
            '    2,\n' +
            '    "3"\n' +
            ']';
        let check = JSONPP.parse(test, {
            A: A
        });
        expect(check instanceof A).toBeTruthy();
        expect(check.length).toBe(3);
        expect(check.hasOwnProperty('_foo')).toBeTruthy();
        expect(check._foo).toBe('foo');
        expect(check[0]).toBe('1');
        expect(check[1]).toBe(2);
        expect(check[2]).toBe('3');
    });
    it('should work with deep objects', () => {
        let test = '{"foo":{"bar":"baz","qux":[1,2,3]}}';
        let check = JSONPP.parse(test);
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo.hasOwnProperty('bar')).toBeTruthy();
        expect(check.foo.bar).toBe('baz');
        expect(check.foo.hasOwnProperty('qux')).toBeTruthy();
        expect(check.foo.qux instanceof Array).toBeTruthy();
        expect(check.foo.qux.length).toBe(3);
        expect(check.foo.qux[0]).toBe(1);
        expect(check.foo.qux[1]).toBe(2);
        expect(check.foo.qux[2]).toBe(3);
    });
    it('should work with deep arrays', () => {
        let test = '["foo",["bar",{"baz":"qux"},1],2,3]';
        let check = JSONPP.parse(test);
        expect(check instanceof Array).toBeTruthy();
        expect(check.length).toBe(4);
        expect(check[0]).toBe('foo');
        expect(check[1] instanceof Array).toBeTruthy();
        expect(check[1].length).toBe(3);
        expect(check[1][0]).toBe('bar');
        expect(check[1][1] instanceof Object).toBeTruthy();
        expect(check[1][1].hasOwnProperty('baz')).toBeTruthy();
        expect(check[1][1].baz).toBe('qux');
        expect(check[1][2]).toBe(1);
        expect(check[2]).toBe(2);
        expect(check[3]).toBe(3);
    });
    it('should work with deep lambdas', () => {
        let test = '["foo",["bar",{"baz": () => "baz","qux": (qux) => { return (qux); },"quux": (quux) => quux + 1},1],2,3]';
        let check = JSONPP.parse(test);
        expect(check instanceof Array).toBeTruthy();
        expect(check.length).toBe(4);
        expect(check[0]).toBe('foo');
        expect(check[1] instanceof Array).toBeTruthy();
        expect(check[1].length).toBe(3);
        expect(check[1][0]).toBe('bar');
        expect(check[1][1] instanceof Object).toBeTruthy();
        expect(check[1][1].hasOwnProperty('baz')).toBeTruthy();
        expect(check[1][1].hasOwnProperty('qux')).toBeTruthy();
        expect(check[1][1].hasOwnProperty('quux')).toBeTruthy();
        expect(check[1][1].baz()).toBe('baz');
        expect(check[1][1].qux('qux')).toBe('qux');
        expect(check[1][1].quux(1)).toBe(2);
        expect(check[1][2]).toBe(1);
        expect(check[2]).toBe(2);
        expect(check[3]).toBe(3);
    });
    it('should work with recursive paths', () => {
        let test = '{"foo":"bar","qux":{"baz":/},"quux":/"qux"}';
        let check = JSONPP.parse(test);
        expect(check instanceof Object).toBeTruthy();
        expect(check.hasOwnProperty('foo')).toBeTruthy();
        expect(check.foo).toBe('bar');
        expect(check.hasOwnProperty('qux')).toBeTruthy();
        expect(check.qux instanceof Object).toBeTruthy();
        let check2 = check.qux;
        expect(check.qux.hasOwnProperty('baz')).toBeTruthy();
        expect(check.qux.baz).toBe(check);
        expect(check.hasOwnProperty('quux')).toBeTruthy();
        expect(check.quux).toBe(check2);
    });
});

describe('JSONPP.stringify', () => {
    it('should work with root object', () => {
        let test = {
            foo: 'bar'
        };
        let check = '{"foo":"bar"}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with null', () => {
        let test = {
            foo: null
        };
        let check = '{"foo":null}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with undefined', () => {
        let test = {
            foo: undefined
        };
        let check = '{"foo":undefined}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with typed objects', () => {
        class Foo {
            constructor() {
                this._bar = "baz";
            }

            get Bar() { return (this._bar); }
            set Bar(value) { this._bar = value; }
        }
        let test = {
            foo: new Foo()
        };
        let check = '{"foo":Foo{"Bar":"baz"}}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with root array', () => {
        let test = [
            'foo',
            'bar'
        ];
        let check = '["foo","bar"]';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with lambdas', () => {
        let test = [
            foo => foo,
            function (left, right) { return left + right; },
            (left, right) => { return left + right; }
        ];
        let check = '[(foo) => foo,(left, right) => {\n      return left + right;\n    },(left, right) => {\n      return left + right;\n    }]';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with collections', () => {
        class A extends Array {
            constructor(settings) {
                super();
                this._foo = 'foo';
            }

            get Foo() {
                return (this._foo);
            }
            set Foo(value) {
                this._foo = value;
            }
        }
        let test = new A({ });
        test.push('1');
        test.push(2);
        test.push('3');
        let check = 'A{"Foo":"foo"}["1",2,"3"]';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with deep objects', () => {
        let test = {
            foo: {
                bar: 'baz',
                qux: [1, 2, 3]
            }
        };
        let check = '{"foo":{"bar":"baz","qux":[1,2,3]}}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with deep arrays', () => {
        let test = [
            'foo',
            [
                'bar',
                {
                    'baz': 'qux'
                },
                1
            ],
            2,
            3
        ];
        let check = '["foo",["bar",{"baz":"qux"},1],2,3]';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with deep lambdas', () => {
        let test = [
            "foo",
            [
                "bar",
                {
                    "baz": () => "baz",
                    "qux": (qux) => { return (qux); },
                    "quux": (quux) => quux + 1
                },
                1
            ],
            2,
            3
        ];
        let check = '["foo",["bar",{"baz":() => "baz","qux":(qux) => {\n        return qux;\n      },"quux":(quux) => quux + 1},1],2,3]';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with recursive paths', () => {
        let test = {
            foo: 'bar'
        };
        let test2 = {
            baz: test
        };
        test.qux = test2;
        test.quux = test2;
        let check = '{"foo":"bar","qux":{"baz":/},"quux":/"qux"}';
        expect(JSONPP.stringify(test)).toBe(check);
    });
    it('should work with replacer function', () => {
        let test = {
            foo: 'bar',
            baz: 'qux',
            quux: [ 'foo', 'bar', 'baz', 'qux', 'quux' ]
        };
        let check = '{"foo":"bar","quux":["foo","baz","qux","quux"]}';
        expect(JSONPP.stringify(test, (key, value) => {
            return ((key !== 'baz') && ((key !== 1)));
        })).toBe(check);
    });
});
