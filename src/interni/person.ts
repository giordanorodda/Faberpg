import * as THREE from 'three';
import { lathe, organic, rbox, shadowed, toon } from '../stile/kit';

/**
 * A person, in the same hand-made style as the house: soft rounded shapes,
 * a few clear colours, a simple face with eyes that blink and follow you.
 * Built as a puppet (hips, spine, neck, head, shoulders, elbows, hips,
 * knees) so it can walk, sit, work, read and sleep, and move between them
 * smoothly. The face looks along +z.
 */

export type HairStyle = 'bun' | 'bald' | 'long' | 'short';
export type Pose = 'stand' | 'walk' | 'sit' | 'sitRead' | 'sitWrite' | 'work' | 'stir' | 'sleep' | 'look' | 'sweep' | 'sitRest';

export interface Look {
  height: number;
  /** 1 = slim, 1.25 = stout. */
  girth: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  eyes: number;
  top: number;
  sleeves: number;
  bottom: number;
  shoes: number;
  skirt?: boolean;
  apron?: number;
  shawl?: number;
  coat?: number;
  belt?: number;
  beard?: number;
  glasses?: boolean;
  /** Little marks of character: freckles, rosy cheeks. */
  cheeks?: number;
}

interface Joint {
  g: THREE.Group;
  /** Current rotation (x, y, z), eased towards the target. */
  cur: THREE.Vector3;
  tgt: THREE.Vector3;
}

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export class Person {
  readonly root = new THREE.Group();
  /** Everything above the feet: lifted and turned for sitting and lying. */
  private body = new THREE.Group();
  private j: Record<string, Joint> = {};
  pose: Pose = 'stand';
  private walkPhase = 0;
  /** Where the eyes and head are drawn to (world space), or null to look ahead. */
  lookTarget: THREE.Vector3 | null = null;
  talking = false;
  private blinkT = 2;
  private eyes: THREE.Object3D[] = [];
  private mouth!: THREE.Mesh;
  private props: Record<string, THREE.Object3D> = {};
  private scale: number;
  /** Extra lift of the hips in the current pose (sitting on a chair, lying on a bed). */
  private hipLift = 0;
  private hipLiftTgt = 0;
  private bodyTilt = 0;
  private bodyTiltTgt = 0;
  private seatH = 0.46;

  constructor(readonly look: Look) {
    const s = (this.scale = look.height / 1.7);
    const skin = toon({ color: look.skin, rim: 0.45 });
    const top = toon({ color: look.top, rim: 0.4 });
    const sleeves = toon({ color: look.sleeves, rim: 0.4 });
    const bottom = toon({ color: look.bottom, rim: 0.35 });
    const shoes = toon({ color: look.shoes, rim: 0.4 });
    const hair = toon({ color: look.hair, rim: 0.5 });
    const g = look.girth;
    this.root.add(this.body);
    const joint = (name: string, parent: THREE.Object3D, at: THREE.Vector3): THREE.Group => {
      const grp = new THREE.Group();
      grp.position.copy(at);
      parent.add(grp);
      this.j[name] = { g: grp, cur: v3(), tgt: v3() };
      return grp;
    };
    const hips = joint('hips', this.body, v3(0, 0.92 * s, 0));
    // legs
    for (const side of [-1, 1]) {
      const n = side < 0 ? 'L' : 'R';
      const hip = joint(`hip${n}`, hips, v3(side * 0.085 * s * g, -0.02 * s, 0));
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068 * s * g, 0.3 * s, 4, 12), bottom);
      thigh.position.y = -0.2 * s;
      hip.add(thigh);
      const knee = joint(`knee${n}`, hip, v3(0, -0.42 * s, 0));
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.052 * s, 0.3 * s, 4, 12), bottom);
      shin.position.y = -0.19 * s;
      knee.add(shin);
      const foot = rbox(0.09 * s, 0.07 * s, 0.22 * s, shoes, 0.03 * s);
      foot.position.set(0, -0.4 * s, 0.045 * s);
      knee.add(foot);
    }
    // the trunk: a lathed body, flattened front to back
    const spine = joint('spine', hips, v3(0, 0.02 * s, 0));
    const torsoProf: [number, number][] = [
      [0.0, -0.06],
      [0.15, -0.05],
      [0.165, 0.04],
      [0.15, 0.16],
      [0.165, 0.3],
      [0.165, 0.38],
      [0.15, 0.44],
      [0.1, 0.5],
      [0.05, 0.54],
      [0.0, 0.545],
    ];
    const torso = lathe(
      torsoProf.map(([r, y]) => [r * s * g, y * s]),
      top,
      24,
    );
    torso.scale.z = 0.68;
    spine.add(torso);
    if (look.belt) {
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.158 * s * g, 0.014 * s, 6, 24), toon({ color: look.belt, rim: 0.4 }));
      belt.rotation.x = Math.PI / 2;
      belt.scale.y = 0.68;
      belt.position.y = 0.05 * s;
      spine.add(belt);
    }
    if (look.apron) {
      const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s * g, 0.22 * s * g, 0.6 * s, 20, 1, true, -0.9, 1.8), toon({ color: look.apron, rim: 0.3, side: THREE.DoubleSide }));
      apron.scale.z = 0.75;
      apron.position.set(0, -0.22 * s, 0.012);
      spine.add(apron);
      const bib = new THREE.Mesh(new THREE.CylinderGeometry(0.168 * s * g, 0.162 * s * g, 0.22 * s, 16, 1, true, -0.55, 1.1), toon({ color: look.apron, rim: 0.3, side: THREE.DoubleSide }));
      bib.scale.z = 0.7;
      bib.position.set(0, 0.2 * s, 0.004);
      spine.add(bib);
    }
    if (look.shawl) {
      const shawl = new THREE.Mesh(new THREE.TorusGeometry(0.15 * s * g, 0.034 * s, 8, 24), toon({ color: look.shawl, rim: 0.4 }));
      shawl.rotation.x = Math.PI / 2 - 0.15;
      shawl.scale.set(1, 0.72, 1);
      shawl.position.set(0, 0.45 * s, -0.01);
      spine.add(organic(shawl, 0.05, 3));
    }
    // the skirt (or the tails of a long coat) hangs from the hips, so the legs move inside it
    if (look.skirt || look.coat) {
      const long = look.skirt ? 0.84 : 0.55;
      const prof: [number, number][] = [
        [0.155, 0.04],
        [0.19, -0.1],
        [0.24, -0.35],
        [0.29, -0.6],
        [0.31, -long],
      ];
      const sk = new THREE.Mesh(
        new THREE.LatheGeometry(
          prof.map(([r, y]) => new THREE.Vector2(r * s * g, y * s)),
          28,
          look.skirt ? 0 : 0.45,
          look.skirt ? Math.PI * 2 : Math.PI * 2 - 0.9,
        ),
        toon({ color: look.skirt ? look.bottom : look.coat!, rim: 0.35, side: THREE.DoubleSide }),
      );
      {
        const pp = sk.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pp.count; i++) {
          const x = pp.getX(i);
          const z = pp.getZ(i);
          const y = pp.getY(i);
          const a = Math.atan2(z, x);
          const k = 1 + Math.sin(a * 9) * 0.04 * Math.min(1, -y / (0.4 * s));
          pp.setXYZ(i, x * k, y, z * k);
        }
        sk.geometry.computeVertexNormals();
      }
      sk.scale.z = 0.8;
      const skirtJ = joint('skirt', hips, v3(0, 0.02 * s, 0));
      skirtJ.add(organic(sk, 0.03, 5));
    }
    if (look.coat) {
      // the coat, open at the front so the shirt shows
      const coatProf = torsoProf.slice(0, -1).map(([r, y]) => new THREE.Vector2(r * s * g * 1.07 + 0.004, y * s));
      const coatTop = new THREE.Mesh(new THREE.LatheGeometry(coatProf, 24, 0.42, Math.PI * 2 - 0.84), toon({ color: look.coat, rim: 0.4, side: THREE.DoubleSide }));
      coatTop.scale.z = 0.72;
      spine.add(coatTop);
      // lapels
      for (const side of [-1, 1]) {
        const lapel = rbox(0.045 * s, 0.2 * s, 0.012 * s, toon({ color: look.coat, rim: 0.4 }), 0.004);
        lapel.position.set(side * 0.06 * s * g, 0.38 * s, 0.112 * s * g);
        lapel.rotation.set(-0.15, 0, side * 0.35);
        spine.add(lapel);
      }
    }
    // arms
    for (const side of [-1, 1]) {
      const n = side < 0 ? 'L' : 'R';
      const sh = joint(`shoulder${n}`, spine, v3(side * 0.175 * s * g, 0.45 * s, 0));
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.062 * s * g, 14, 10), sleeves);
      puff.scale.set(1, 0.9, 0.95);
      puff.position.y = -0.02 * s;
      sh.add(puff);
      const upper = lathe([[0.0, 0.0], [0.05, -0.02], [0.046, -0.14], [0.042, -0.26], [0.0, -0.29]].map(([r, y]) => [r * s * g, y * s] as [number, number]), sleeves, 14);
      sh.add(upper);
      const el = joint(`elbow${n}`, sh, v3(0, -0.28 * s, 0));
      const fore = lathe([[0.0, 0.02], [0.042, 0.0], [0.04, -0.12], [0.044, -0.2], [0.046, -0.225], [0.0, -0.23]].map(([r, y]) => [r * s, y * s] as [number, number]), sleeves, 14);
      el.add(fore);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * s, 0.036 * s, 0.03 * s, 12), skin);
      cuff.position.y = -0.235 * s;
      el.add(cuff);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042 * s, 12, 10), skin);
      hand.scale.set(0.8, 1.15, 0.6);
      hand.position.y = -0.28 * s;
      el.add(hand);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012 * s, 0.03 * s, 3, 6), skin);
      thumb.position.set(-side * 0.025 * s, -0.27 * s, 0.02 * s);
      thumb.rotation.z = side * 0.5;
      el.add(thumb);
      this.props[`hand${n}`] = hand;
    }
    // neck and head
    const neckJ = joint('neck', spine, v3(0, 0.52 * s, 0));
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.1 * s, 12), skin);
    neck.position.y = 0.03 * s;
    neckJ.add(neck);
    const head = joint('head', neckJ, v3(0, 0.08 * s, 0));
    const hs = s * 1.04; // heads a touch large, as in the films
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.112 * hs, 28, 20), skin);
    skull.scale.set(0.95, 1.08, 1.0);
    skull.position.y = 0.11 * hs;
    head.add(skull);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.085 * hs, 20, 14), skin);
    jaw.scale.set(1.0, 0.85, 0.95);
    jaw.position.set(0, 0.055 * hs, 0.022 * hs);
    head.add(jaw);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024 * hs, 10, 8), skin);
      ear.scale.set(0.5, 1, 0.8);
      ear.position.set(side * 0.105 * hs, 0.105 * hs, -0.005);
      head.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018 * hs, 10, 8), skin);
    nose.scale.set(0.9, 1.1, 1.2);
    nose.position.set(0, 0.095 * hs, 0.112 * hs);
    head.add(nose);
    // eyes: dark, with a spark of light; they close to blink
    const iris = toon({ color: look.eyes, rim: 0 });
    const spark = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.016 * hs, 12, 10), iris);
      e.scale.set(0.8, 1.15, 0.5);
      eye.add(e);
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.004 * hs, 6, 5), spark);
      sp.position.set(0.004 * hs, 0.006 * hs, 0.008 * hs);
      eye.add(sp);
      eye.position.set(side * 0.04 * hs, 0.125 * hs, 0.1 * hs);
      eye.rotation.y = side * 0.25;
      head.add(eye);
      this.eyes.push(eye);
      const brow = rbox(0.038 * hs, 0.007 * hs, 0.008 * hs, hair, 0.003);
      brow.position.set(side * 0.042 * hs, 0.152 * hs, 0.105 * hs);
      brow.rotation.set(-0.2, side * 0.25, side * -0.12);
      head.add(brow);
      if (look.cheeks) {
        const ch = new THREE.Mesh(new THREE.CircleGeometry(0.016 * hs, 12), toon({ color: look.cheeks, transparent: true, opacity: 0.45, rim: 0 }));
        ch.position.set(side * 0.058 * hs, 0.085 * hs, 0.098 * hs);
        ch.rotation.y = side * 0.55;
        head.add(ch);
      }
    }
    // the mouth: a small dark shape that opens when speaking
    this.mouth = new THREE.Mesh(new THREE.SphereGeometry(0.014 * hs, 12, 8), toon({ color: 0x5a2a22, rim: 0 }));
    this.mouth.scale.set(1.4, 0.25, 0.4);
    this.mouth.position.set(0, 0.058 * hs, 0.103 * hs);
    head.add(this.mouth);
    // hair
    this.hair(head, hs, hair, look);
    if (look.beard) this.beard(head, hs, toon({ color: look.beard, rim: 0.45 }));
    if (look.glasses) {
      const brass = toon({ color: 0xc8a050, rim: 0.7 });
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.02 * hs, 0.0025 * hs, 6, 16), brass);
        rim.position.set(side * 0.04 * hs, 0.125 * hs, 0.112 * hs);
        head.add(rim);
      }
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.002 * hs, 0.002 * hs, 0.04 * hs, 5), brass);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.13 * hs, 0.118 * hs);
      head.add(bridge);
    }
    // things held in some poses: a book, a pen, a spoon, a broom
    const book = new THREE.Group();
    const cover = rbox(0.16 * s, 0.012 * s, 0.22 * s, toon({ color: 0x6a2a22, rim: 0.3 }), 0.004);
    book.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.02 * s, 0.205 * s), toon({ color: 0xeee2c4, rim: 0.1 }));
    pages.position.y = 0.014 * s;
    book.add(pages);
    book.visible = false;
    this.props.book = book;
    this.root.add(book);
    // a blanket pulled up to the chest, for the night
    const blanket = rbox(0.64 * s, 0.12 * s, 1.4 * s, toon({ color: 0x8a5a4a, rim: 0.25 }), 0.045 * s);
    blanket.visible = false;
    this.props.blanket = organic(shadowed(blanket), 0.04, 5);
    this.root.add(blanket);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.004, 0.16, 5), toon({ color: 0xe8e0d0 }));
    pen.visible = false;
    this.props.pen = pen;
    (this.props.handR as THREE.Mesh).add(pen);
    pen.position.set(0, -0.04, 0.03);
    pen.rotation.x = 1.2;
    const spoon = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.45, 6), toon({ color: 0xc8a068 }));
    spoon.visible = false;
    spoon.position.set(0, -0.15, 0.04);
    this.props.spoon = spoon;
    (this.props.handR as THREE.Mesh).add(spoon);
    shadowed(this.root);
    this.root.userData.noWonk = true;
  }

  private hair(head: THREE.Group, hs: number, hair: THREE.Material, look: Look): void {
    // hair: a cap over the crown (down to the brow) and a fall over the back of the head, open at the face
    const crown = (r: number, thetaLen: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, thetaLen), hair);
      m.scale.set(0.98, 1.08, 1.03);
      m.position.set(0, 0.114 * hs, -0.004);
      m.rotation.x = -0.18; // the hairline sits higher at the front
      return m;
    };
    const back = (r: number, thetaLen: number) => {
      // phi measured from +x towards -z: the half from the ears round the back
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 16, Math.PI * 0.9, Math.PI * 1.2, 0.25, thetaLen), hair);
      m.scale.set(0.98, 1.08, 1.03);
      m.position.set(0, 0.112 * hs, -0.004);
      return m;
    };
    if (look.hairStyle === 'bun' || look.hairStyle === 'long' || look.hairStyle === 'short') {
      head.add(crown(0.12 * hs, Math.PI * 0.36));
      head.add(back(0.121 * hs, Math.PI * (look.hairStyle === 'short' ? 0.4 : 0.48)));
      // hair falling at the temples, framing the face
      for (const side of [-1, 1]) {
        const temple = new THREE.Mesh(new THREE.SphereGeometry(0.045 * hs, 12, 10), hair);
        temple.scale.set(0.45, 1.25, 0.7);
        temple.position.set(side * 0.1 * hs, 0.13 * hs, 0.035 * hs);
        temple.rotation.z = side * -0.15;
        head.add(temple);
      }
      // a soft parted fringe: two swept locks
      for (const side of [-1, 1]) {
        const lock = new THREE.Mesh(new THREE.SphereGeometry(0.05 * hs, 14, 10), hair);
        lock.scale.set(1.25, 0.42, 0.55);
        lock.position.set(side * 0.05 * hs, 0.2 * hs, 0.085 * hs);
        lock.rotation.set(-0.35, side * 0.4, side * -0.45);
        head.add(lock);
      }
    }
    if (look.hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.058 * hs, 16, 12), hair);
      bun.position.set(0, 0.21 * hs, -0.085 * hs);
      head.add(organic(bun, 0.08, 2));
      // a few strands that escaped
      for (const side of [-1, 1]) {
        const strand = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(side * 0.1 * hs, 0.16 * hs, 0.04 * hs), v3(side * 0.115 * hs, 0.08 * hs, 0.05 * hs), v3(side * 0.105 * hs, 0.02 * hs, 0.06 * hs)]), 8, 0.004 * hs, 4),
          hair,
        );
        head.add(strand);
      }
      // a pin through the bun, the herbalist's habit
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14 * hs, 5), toon({ color: 0x8a5a3a }));
      pin.position.set(0, 0.22 * hs, -0.09 * hs);
      pin.rotation.z = 1.2;
      head.add(pin);
    }
    if (look.hairStyle === 'long') {
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * hs, 0.2 * hs, 6, 14), hair);
      back.scale.z = 0.5;
      back.position.set(0, 0.0, -0.08 * hs);
      head.add(back);
    }
    if (look.hairStyle === 'bald') {
      // a crown of grey hair round the back, wild over the ears
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 * hs, 0.03 * hs, 8, 24, Math.PI * 1.3), hair);
      ring.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.85 + Math.PI);
      ring.position.set(0, 0.1 * hs, -0.01);
      head.add(organic(ring, 0.15, 4));
      for (const side of [-1, 1]) {
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.035 * hs, 10, 8), hair);
        tuft.position.set(side * 0.1 * hs, 0.14 * hs, -0.02);
        head.add(organic(tuft, 0.2, side + 3));
      }
    }
  }

  private beard(head: THREE.Group, hs: number, mat: THREE.Material): void {
    const b = new THREE.Group();
    const main = new THREE.Mesh(new THREE.SphereGeometry(0.075 * hs, 18, 14), mat);
    main.scale.set(1.05, 1.2, 0.8);
    main.position.set(0, 0.02 * hs, 0.06 * hs);
    b.add(main);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04 * hs, 12, 10), mat);
      cheek.position.set(side * 0.07 * hs, 0.06 * hs, 0.05 * hs);
      b.add(cheek);
      const tache = new THREE.Mesh(new THREE.CapsuleGeometry(0.012 * hs, 0.04 * hs, 4, 8), mat);
      tache.rotation.z = side * 1.2;
      tache.position.set(side * 0.025 * hs, 0.07 * hs, 0.112 * hs);
      b.add(tache);
    }
    head.add(organic(b, 0.12, 7));
    // the mouth sits just above the beard, in the moustache's shadow
    this.mouth.position.z += 0.01;
  }

  /** Sets the height of the seat for sitting poses. */
  setSeat(h: number): void {
    this.seatH = h;
  }

  /** Puts the body in its pose at once, without easing (when someone is placed rather than arriving). */
  settle(): void {
    this.update(1, 0, 0);
  }

  /** Changes what the person is doing; the body eases into it. */
  setPose(p: Pose): void {
    this.pose = p;
  }

  private target(name: string, x = 0, y = 0, z = 0): void {
    this.j[name]?.tgt.set(x, y, z);
  }

  /** Called every frame. `speed` is how fast the person walks (m/s), when walking. */
  update(dt: number, t: number, speed = 0): void {
    const s = this.scale;
    for (const k of Object.keys(this.j)) this.target(k);
    const p = this.pose;
    const breathe = Math.sin(t * 1.4) * 0.015;
    this.hipLiftTgt = 0;
    this.bodyTiltTgt = 0;
    this.target('spine', breathe, 0, 0);
    // arms hang a little away from the body, elbows soft
    this.target('shoulderL', 0.05, 0, -0.1);
    this.target('shoulderR', 0.05, 0, 0.1);
    this.target('elbowL', -0.18);
    this.target('elbowR', -0.18);
    const sitting = p === 'sit' || p === 'sitRead' || p === 'sitWrite' || p === 'sitRest';
    if (p === 'walk') {
      this.walkPhase += dt * speed * 5.2;
      const w = this.walkPhase;
      const sw = 0.42;
      this.target('hipL', Math.sin(w) * sw);
      this.target('hipR', -Math.sin(w) * sw);
      this.target('kneeL', Math.max(0, -Math.sin(w + 0.6)) * 0.75 + 0.05);
      this.target('kneeR', Math.max(0, Math.sin(w + 0.6)) * 0.75 + 0.05);
      this.target('shoulderL', -Math.sin(w) * 0.32, 0, -0.08);
      this.target('shoulderR', Math.sin(w) * 0.32, 0, 0.08);
      this.target('elbowL', -0.25 - Math.max(0, Math.sin(w)) * 0.2);
      this.target('elbowR', -0.25 - Math.max(0, -Math.sin(w)) * 0.2);
      this.target('spine', 0.05, Math.sin(w) * 0.06, 0);
      this.target('skirt', -Math.sin(w * 2) * 0.03, 0, Math.sin(w) * 0.04);
      this.hipLiftTgt = Math.abs(Math.cos(w)) * 0.025 * s;
    } else if (sitting) {
      this.hipLiftTgt = this.seatH + 0.05 - 0.92 * s;
      this.target('hipL', -1.45, 0, 0.06);
      this.target('hipR', -1.45, 0, -0.06);
      this.target('kneeL', 1.45);
      this.target('kneeR', 1.45);
      this.target('skirt', -1.1, 0, 0);
      this.target('spine', -0.05 + breathe, 0, 0);
      this.target('shoulderL', -0.45, 0, -0.12);
      this.target('shoulderR', -0.45, 0, 0.12);
      this.target('elbowL', -0.9);
      this.target('elbowR', -0.9);
      if (p === 'sitRead') {
        this.target('shoulderL', -0.75, 0.25, -0.05);
        this.target('shoulderR', -0.75, -0.25, 0.05);
        this.target('elbowL', -1.3);
        this.target('elbowR', -1.3);
        this.target('neck', 0.25);
        this.target('head', 0.2);
      } else if (p === 'sitWrite') {
        const k = Math.sin(t * 3) * 0.08;
        this.target('spine', 0.18, 0, 0);
        this.target('shoulderR', -1.0 + k, -0.2, 0.05);
        this.target('elbowR', -0.8 - k);
        this.target('shoulderL', -0.85, 0.3, -0.05);
        this.target('elbowL', -1.1);
        this.target('neck', 0.3);
        this.target('head', 0.25);
      } else if (p === 'sitRest') {
        this.target('spine', -0.15 + breathe, 0, 0);
        this.target('neck', -0.05);
      }
    } else if (p === 'work') {
      // at a table: hands busy in front, the body leaning in, a small rhythm
      const k = Math.sin(t * 4.2);
      this.target('spine', 0.22, 0, 0);
      this.target('shoulderL', -0.8 + k * 0.08, 0.25, -0.05);
      this.target('shoulderR', -0.85 - k * 0.08, -0.25, 0.05);
      this.target('elbowL', -0.85);
      this.target('elbowR', -0.85 + k * 0.1);
      this.target('neck', 0.3);
      this.target('head', 0.25);
    } else if (p === 'stir') {
      const k = t * 2.2;
      this.target('spine', 0.18, 0, 0);
      this.target('shoulderR', -0.95 + Math.sin(k) * 0.12, -0.2 + Math.cos(k) * 0.15, 0.08);
      this.target('elbowR', -0.7);
      this.target('shoulderL', -0.3, 0, -0.15);
      this.target('elbowL', -1.2);
      this.target('neck', 0.25);
      this.target('head', 0.2);
    } else if (p === 'look') {
      // at the window, hands clasped behind the back
      this.target('shoulderL', 0.35, 0, -0.18);
      this.target('shoulderR', 0.35, 0, 0.18);
      this.target('elbowL', -0.9);
      this.target('elbowR', -0.9);
      this.target('neck', -0.05, Math.sin(t * 0.3) * 0.25, 0);
    } else if (p === 'sweep') {
      const k = Math.sin(t * 3);
      this.target('spine', 0.25, k * 0.15, 0);
      this.target('shoulderL', -0.6, 0.4, -0.1);
      this.target('shoulderR', -0.3, 0.3, 0.1);
      this.target('elbowL', -0.7);
      this.target('elbowR', -0.9);
    } else if (p === 'sleep') {
      // lying on the back
      this.bodyTiltTgt = -Math.PI / 2;
      // arms along the body, under the blanket
      this.target('shoulderL', -0.05, 0, -0.06);
      this.target('shoulderR', -0.05, 0, 0.06);
      this.target('elbowL', -0.25);
      this.target('elbowR', -0.25);
      this.target('neck', -0.15);
    }
    // the head turns towards whoever is near, within what a neck can do
    if (this.lookTarget && p !== 'sleep') {
      const head = this.j.head.g;
      const hp = head.getWorldPosition(new THREE.Vector3());
      const d = this.lookTarget.clone().sub(hp);
      const inv = new THREE.Quaternion();
      this.root.getWorldQuaternion(inv).invert();
      d.applyQuaternion(inv);
      const yaw = THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -1.1, 1.1);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.5);
      const n = this.j.neck.tgt;
      n.y = yaw * 0.6;
      n.x = pitch * 0.5;
      this.j.head.tgt.set(pitch * 0.5, yaw * 0.4, 0);
    }
    // ease every joint towards where it wants to be
    const k = Math.min(1, dt * (p === 'walk' ? 14 : 6));
    for (const jt of Object.values(this.j)) {
      jt.cur.lerp(jt.tgt, k);
      jt.g.rotation.set(jt.cur.x, jt.cur.y, jt.cur.z);
    }
    this.hipLift += (this.hipLiftTgt - this.hipLift) * Math.min(1, dt * 6);
    this.bodyTilt += (this.bodyTiltTgt - this.bodyTilt) * Math.min(1, dt * 4);
    this.j.hips.g.position.y = 0.92 * s + this.hipLift;
    this.body.rotation.x = this.bodyTilt;
    // lying down, the whole body rests on the bed (seat height = top of the mattress)
    // (the body turns about the feet: slide it back so the hips stay where the person is)
    const lie = Math.min(1, this.bodyTilt / (-Math.PI / 2));
    this.body.position.y = lie * (this.seatH + 0.12 * s);
    this.body.position.z = lie * 0.92 * s;
    this.props.blanket.visible = lie > 0.9;
    this.props.blanket.position.set(0, this.seatH + 0.13 * s, 0.25 * s);
    // things in hand
    this.props.book.visible = p === 'sitRead';
    if (p === 'sitRead') {
      const hl = this.props.handL.getWorldPosition(new THREE.Vector3());
      const hr = this.props.handR.getWorldPosition(new THREE.Vector3());
      const mid = hl.add(hr).multiplyScalar(0.5);
      this.root.worldToLocal(mid);
      this.props.book.position.copy(mid).add(new THREE.Vector3(0, 0.03, 0.02));
      this.props.book.rotation.set(-0.7, 0, 0);
    }
    this.props.pen.visible = p === 'sitWrite';
    this.props.spoon.visible = p === 'stir';
    // blinking, and the eyes shut in sleep
    this.blinkT -= dt;
    let open = 1;
    if (this.blinkT < 0.12) open = Math.abs(this.blinkT - 0.06) / 0.06;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    if (p === 'sleep') open = 0.08;
    for (const e of this.eyes) e.scale.y = Math.max(0.08, open);
    // the mouth moves while speaking
    this.mouth.scale.y = this.talking ? 0.3 + Math.abs(Math.sin(t * 13) * Math.sin(t * 5.3)) * 0.9 : 0.25;
  }
}
