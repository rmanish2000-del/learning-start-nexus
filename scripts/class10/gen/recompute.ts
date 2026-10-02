// Independent recomputation of every numeric claim made by an authored item.
// Implemented from the mathematics/physics definitions, not from the authors'
// arithmetic, so a wrong answer in an author module fails validation.

const D = (deg: number) => (deg * Math.PI) / 180;
const gcd2 = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const RECOMPUTE: Record<string, (a: number[]) => number> = {
  // number systems / algebra
  gcd: ([a, b]) => gcd2(a!, b!),
  gcd3: ([a, b, c]) => gcd2(gcd2(a!, b!), c!),
  lcm: ([a, b]) => Math.abs(a! * b!) / gcd2(a!, b!),
  lcm3: ([a, b, c]) => {
    const l = Math.abs(a! * b!) / gcd2(a!, b!);
    return Math.abs(l * c!) / gcd2(l, c!);
  },
  product_over: ([a, b, c]) => (a! * b!) / c!,
  product_of_primes: (args) => args.reduce((p, n) => p * n, 1),
  half: ([a]) => a! / 2,
  percentage: ([part, whole]) => (part! / whole!) * 100,
  sum_of_squares: (args) => args.reduce((s, n) => s + n * n, 0),
  cumulative: (args) => args.reduce((s, n) => s + n, 0),
  linear2: ([a, b, c, d, e, f]) => {
    // solves a x + b y = c, d x + e y = f -> returns x
    const det = a! * e! - b! * d!;
    return (c! * e! - b! * f!) / det;
  },
  discriminant: ([a, b, c]) => b! * b! - 4 * a! * c!,
  equal_roots_k: ([a, c]) => 2 * Math.sqrt(a! * c!),
  quadratic_roots_sum: ([a, b]) => -b! / a!,
  sum_zeroes: ([a, b]) => -b! / a!,
  product_zeroes: ([a, c]) => c! / a!,
  sum_zeroes_from_pair: ([p, q]) => p! + q!,
  poly_from_roots_b: ([p, q]) => -(p! + q!),
  ratio_k: ([a, b]) => a! / b!,
  ap_term: ([a, d, n]) => a! + (n! - 1) * d!,
  ap_index: ([a, d, term]) => (term! - a!) / d! + 1,
  ap_sum: ([a, d, n]) => (n! / 2) * (2 * a! + (n! - 1) * d!),
  ap_sum_first_last: ([a, l, n]) => (n! / 2) * (a! + l!),

  // similarity / circles
  bpt_ec: ([ad, db, ae]) => (ae! * db!) / ad!,
  square_ratio: ([a, b]) => (a! * a!) / (b! * b!),
  sqrt_ratio: ([a, b]) => Math.sqrt(a!) / Math.sqrt(b!),
  proportion: ([a, b, c]) => (a! * c!) / b!,
  ratio_equal: ([a, b, c, d]) => (Math.abs(a! / b! - c! / d!) < 1e-9 ? 1 : 0),
  altitude_right: ([p, q]) => (p! * q!) / Math.hypot(p!, q!),
  tangent_length: ([op, r]) => Math.sqrt(op! * op! - r! * r!),
  hypotenuse: ([a, b]) => Math.hypot(a!, b!),
  angle_sum: ([x, y]) => 180 - x! - y!,
  circumscribed_da: ([ab, bc, cd]) => ab! + cd! - bc!,
  op_from_angle: ([r, angle]) => r2(r! / Math.sin(D(angle! / 2))),

  // coordinate geometry
  distance: ([x1, y1, x2, y2]) => r3(Math.hypot(x2! - x1!, y2! - y1!)),
  midpoint_x: ([x1, x2]) => (x1! + x2!) / 2,
  section_x: ([x1, x2, m, n]) => (m! * x2! + n! * x1!) / (m! + n!),
  equidistant_x: ([x1, y1, x2, y2]) =>
    (x2! * x2! + y2! * y2! - x1! * x1! - y1! * y1!) / (2 * (x2! - x1!)),
  equidistant_y: ([x1, y1, x2, y2]) =>
    (x2! * x2! + y2! * y2! - x1! * x1! - y1! * y1!) / (2 * (y2! - y1!)),
  axis_ratio_x: ([x1, x2]) => -x1! / x2!,
  axis_ratio_y: ([y1, y2]) => -y1! / y2!,
  fourth_vertex_x: ([a, b, c]) => a! + c! - b!,
  triangle_perimeter: ([x1, y1, x2, y2, x3, y3]) =>
    r3(Math.hypot(x2! - x1!, y2! - y1!) + Math.hypot(x3! - x2!, y3! - y2!) + Math.hypot(x1! - x3!, y1! - y3!)),
  path_two_legs: ([x1, y1, x2, y2, x3, y3]) =>
    r3(Math.hypot(x2! - x1!, y2! - y1!) + Math.hypot(x3! - x2!, y3! - y2!)),

  // trigonometry
  cos_from_sin: ([p, h]) => Math.sqrt(h! * h! - p! * p!) / h!,
  sin_from_cos: ([b, h]) => Math.sqrt(h! * h! - b! * b!) / h!,
  trig_sum: ([a, b]) => Math.sin(D(a!)) + Math.cos(D(b!)),
  pythag_identity: ([a]) => Math.sin(D(a!)) ** 2 + Math.cos(D(a!)) ** 2,
  arctan_deg: ([t]) => r3((Math.atan(t!) * 180) / Math.PI),
  arcsin_deg: ([s]) => r3((Math.asin(s!) * 180) / Math.PI),
  sec_from_tan: ([t]) => r3(Math.sqrt(1 + t! * t!)),
  cot_from_cosec: ([c]) => r3(Math.sqrt(c! * c! - 1)),
  tan_cot_sum: ([a]) => r3(Math.tan(D(a!)) + 1 / Math.tan(D(a!))),
  two_sin_cos: ([a, b]) => r3(2 * Math.sin(D(a!)) * Math.cos(D(b!))),
  tan_squared: ([a]) => r3(Math.tan(D(a!)) ** 2),
  tan_height: ([d, angle]) => r2(d! * Math.tan(D(angle!))),
  tan_distance: ([h, angle]) => r2(h! / Math.tan(D(angle!))),
  sin_height: ([len, angle]) => r2(len! * Math.sin(D(angle!))),

  // mensuration
  sector_area: ([r, theta, pi]) => r2((theta! / 360) * pi! * r! * r!),
  sector_area_multi: ([r, theta, pi, n]) => r2(n! * (theta! / 360) * pi! * r! * r!),
  arc_length: ([r, theta, pi]) => r2((theta! / 360) * 2 * pi! * r!),
  sector_perimeter: ([r, theta, pi]) => r2((theta! / 360) * 2 * pi! * r! + 2 * r!),
  segment_area_right: ([r, pi]) => r2(0.25 * pi! * r! * r! - 0.5 * r! * r!),
  sector_angle: ([r, area, pi]) => r2((area! * 360) / (pi! * r! * r!)),
  hemisphere_volume: ([r, pi]) => r2((2 / 3) * pi! * r! ** 3),
  hemisphere_tsa: ([r, pi]) => r2(3 * pi! * r! * r!),
  sphere_volume: ([r, pi]) => r2((4 / 3) * pi! * r! ** 3),
  sphere_area: ([r, pi]) => r2(4 * pi! * r! * r!),
  cone_volume: ([r, h, pi]) => r2((1 / 3) * pi! * r! * r! * h!),
  cone_csa: ([r, h, pi]) => r2(pi! * r! * Math.hypot(r!, h!)),
  cone_plus_hemisphere_volume: ([r, h, pi]) => r2((1 / 3) * pi! * r! * r! * h! + (2 / 3) * pi! * r! ** 3),
  cylinder_volume: ([r, h, pi]) => r2(pi! * r! * r! * h!),
  cylinder_csa: ([r, h, pi]) => r2(2 * pi! * r! * h!),
  capsule_volume: ([r, l, pi]) => r2(pi! * r! * r! * l! + (4 / 3) * pi! * r! ** 3),
  cylinder_over_cone: ([r, h]) => r3((Math.PI * r! * r! * h!) / ((1 / 3) * Math.PI * r! * r! * h!)),
  recast_cylinder_height: ([rs, rc]) => r2(((4 / 3) * rs! ** 3) / (rc! * rc!)),

  // statistics and probability
  class_mark: ([a, b]) => (a! + b!) / 2,
  grouped_mean: (args) => {
    let fx = 0;
    let f = 0;
    for (let i = 0; i < args.length; i += 2) {
      fx += args[i]! * args[i + 1]!;
      f += args[i + 1]!;
    }
    return r2(fx / f);
  },
  assumed_mean: (args) => {
    const a = args[0]!;
    let fd = 0;
    let f = 0;
    for (let i = 1; i < args.length; i += 2) {
      fd += args[i]! * args[i + 1]!;
      f += args[i + 1]!;
    }
    return r2(a + fd / f);
  },
  grouped_mode: ([l, f1, f0, f2, h]) => r2(l! + ((f1! - f0!) / (2 * f1! - f0! - f2!)) * h!),
  grouped_median: ([l, n, cf, f, h]) => r2(l! + (n! / 2 - cf!) / f! * h!),
  median_class_cf: (freqs) => {
    const n = freqs.reduce((s, x) => s + x, 0);
    let cum = 0;
    for (const f of freqs) {
      if (cum + f >= n / 2) return cum;
      cum += f;
    }
    return cum;
  },
  empirical_mode: ([mean, median]) => 3 * median! - 2 * mean!,
  empirical_median: ([mode, mean]) => (mode! + 2 * mean!) / 3,
  probability: ([fav, total]) => fav! / total!,
  complement: ([p]) => r2(1 - p!),

  // science — optics
  mirror_v: ([u, f]) => r2(1 / (1 / f! - 1 / u!)),
  mirror_magnification: ([u, f]) => {
    const v = 1 / (1 / f! - 1 / u!);
    return r2(-v / u!);
  },
  lens_v: ([u, f]) => r2(1 / (1 / f! + 1 / u!)),
  lens_power: ([fCm]) => r2(100 / fCm!),
  myopia_power: ([farPointCm]) => r2(-100 / farPointCm!),
  hypermetropia_power: ([nearPointCm, targetCm]) => r2(100 / (1 / (-1 / nearPointCm! + 1 / targetCm!))),

  // science — electricity and magnetism
  ohm_current: ([v, r]) => v! / r!,
  ohm_voltage: ([i, r]) => i! * r!,
  series_r: (args) => args.reduce((s, r) => s + r, 0),
  parallel_r: (args) => r3(1 / args.reduce((s, r) => s + 1 / r, 0)),
  resistivity_r: ([rho, l, a]) => (rho! * l!) / a!,
  joule_heat: ([i, r, t]) => i! * i! * r! * t!,
  power_vi: ([v, i]) => v! * i!,
  energy_kwh: ([watts, hoursPerDay, days]) => r2((watts! * hoursPerDay! * days!) / 1000),
  energy_cost: ([watts, hoursPerDay, days, rate]) => r2(((watts! * hoursPerDay! * days!) / 1000) * rate!),
  turns_field: ([from, to]) => to! / from!,

  // science — ecology
  trophic_energy: ([producerEnergy, level]) => r3(producerEnergy! * 0.1 ** (level! - 1)),
};
