import { onCleanup } from "@reactively/core";
import { HasReactive, reactive } from "@reactively/decorate";

/* 
        a  b
        | /
        c
*/
test("two signals", () => {
  class TwoSignals extends HasReactive {
    @reactive a = 7;
    @reactive b = 1;

    callCount1 = 0;
    @reactive c(): number {
      this.callCount1++;
      const result = this.a * this.b;
      return result;
    }
  }

  const o = new TwoSignals();
  o.a = 2;
  expect(o.c()).toBe(2);
  o.b = 3;
  expect(o.c()).toBe(6);
  expect(o.callCount1).toEqual(2);

  expect(o.c()).toBe(6);
  expect(o.callCount1).toEqual(2);
});

/* 
        a  b
        | /
        c
        |
        d
*/
test("dependent computed", () => {
  class TwoComputed extends HasReactive {
    @reactive a = 7;
    @reactive b = 1;

    callCount1 = 0;
    @reactive c(): number {
      this.callCount1++;
      const result = this.a * this.b;
      return result;
    }

    callCount2 = 0;
    @reactive d(): number {
      this.callCount2++;
      const result = this.c() + 1;
      return result;
    }
  }
  const o = new TwoComputed();
  expect(o.d()).toBe(8);
  expect(o.callCount1).toBe(1);
  expect(o.callCount2).toBe(1);
  o.a = 3;
  expect(o.d()).toBe(4);
  expect(o.callCount1).toBe(2);
  expect(o.callCount2).toBe(2);
});

/*
      a
      |
      c
*/
test("equality check", () => {
  class OneReaction extends HasReactive {
    callCount1 = 0;
    @reactive a = 7;
    @reactive c() {
      this.callCount1++;
      const result = this.a + 10;
      return result;
    }
  }
  const o = new OneReaction();
  o.c();
  o.c();
  expect(o.callCount1).toBe(1);

  o.a = 7;

  o.c();
  expect(o.callCount1).toBe(1); // unchanged, equality check
});

/*
      a     b
      |     |
      cA   cB
      |   / (dynamically depends on cB)
      cAB
*/
test("dynamic computed", () => {
  class DyanmicComputed extends HasReactive {
    @reactive a = 1;
    @reactive b = 2;

    callCountA = 0;
    @reactive cA() {
      this.callCountA++;
      return this.a;
    }

    callCountB = 0;
    @reactive cB() {
      this.callCountB++;
      return this.b;
    }

    callCountAB = 0;
    @reactive cAB() {
      this.callCountAB++;
      return this.cA() || this.cB();
    }
  }
  const simple = new DyanmicComputed();
  expect(simple.cAB()).toBe(1);
  simple.a = 2;
  simple.b = 3;
  expect(simple.cAB()).toBe(2);
  expect(simple.callCountA).toBe(2);
  expect(simple.callCountAB).toBe(2);
  expect(simple.callCountB).toBe(0);
  simple.a = 0;
  expect(simple.cAB()).toBe(3);
  expect(simple.callCountA).toBe(3);
  expect(simple.callCountAB).toBe(3);
  expect(simple.callCountB).toBe(1);
  simple.b = 4;
  expect(simple.cAB()).toBe(4);
  expect(simple.callCountA).toBe(3);
  expect(simple.callCountAB).toBe(4);
  expect(simple.callCountB).toBe(2);
});

class CleanupCounter {
  oldValues: number[] = [];

  cleanup(old: number): void {
    this.oldValues.push(old);
  }
}

/*
      a
      |
      c (cleanup)
*/
test("onCleanup", () => {
  class Cleanup extends HasReactive {
    counter = new CleanupCounter();

    @reactive a = 1;

    @reactive c() {
      onCleanup((old) => {
        this.counter.cleanup(old);
      });

      return this.a + 1;
    }
  }
  const startValue = 2;
  const o = new Cleanup();
  expect(o.c()).toEqual(startValue);
  expect(o.counter.oldValues.length).toEqual(0);

  o.a = 3;
  expect(o.c()).toEqual(4);
  expect(o.counter.oldValues).toEqual([startValue]);
});

/* 
        a  
        | 
        b (=)
        |
        c
*/
test("boolean equality check", () => {
  class BooleanCheck extends HasReactive {
    @reactive a = 0;

    @reactive b() {
      return this.a > 0;
    }

    callCount = 0;

    @reactive c() {
      this.callCount++;
      return this.b() ? 1 : 0;
    }
  }

  const o = new BooleanCheck();
  expect(o.c()).toBe(0);
  expect(o.callCount).toBe(1);

  o.a = 1;
  expect(o.c()).toBe(1);
  expect(o.callCount).toBe(2);

  o.a = 2;
  expect(o.c()).toBe(1);
  expect(o.callCount).toBe(2); // unchanged, oughtn't run because bool didn't change
});

/*
      s
      |
      a
      | \ 
      b  c
       \ |
         d
*/
test("diamond computeds", () => {
  class DiamondComputeds extends HasReactive {
    @reactive s = 1;
    @reactive a() {
      return this.s;
    }
    @reactive b() {
      return this.a() * 2;
    }
    @reactive c() {
      return this.a() * 3;
    }

    callCount = 0;
    @reactive d() {
      this.callCount++;
      return this.b() + this.c();
    }
  }
  const c = new DiamondComputeds();
  expect(c.d()).toBe(5);
  expect(c.callCount).toBe(1);
  c.s = 2;
  expect(c.d()).toBe(10);
  expect(c.callCount).toBe(2);
  c.s = 3;
  expect(c.d()).toBe(15);
  expect(c.callCount).toBe(3);
});

/*
      s
      | 
      l  a (sets s)
*/
test("set inside reaction", () => {
  class SetInsideReaction extends HasReactive {
    @reactive s = 1;
    @reactive a() {
      this.s = 2;
    }
    @reactive l() {
      return this.s + 100;
    }
  }

  const o = new SetInsideReaction();
  o.a();
  expect(o.l()).toEqual(102);
});
