"""Machine-readable marking specifications for the 42 unresolved qualitative,
proof and definition items (Class 10, 2026-27).

Each specification is authored deterministically from the item's own curriculum
outcome and the CBSE subject syllabus section it is mapped to. A specification
states what a correct response must conclude, the reasoning that must be
present, which alternative wordings are acceptable, the terminology and units a
marker must accept or require, the mistakes that must not be rewarded, and the
minimum evidence needed to award the mark.

These are automated, founder-authorised marking specifications. They are not a
named-human SME decision, copyright clearance, official CBSE/NCERT
certification, or production approval.
"""

from __future__ import annotations

# ruff: noqa: E501

Spec = dict

SPECS: dict[str, Spec] = {
    # ------------------------------------------------------------------
    # Mathematics — Number Systems (LO_M1.1.2), irrationality
    # ------------------------------------------------------------------
    "C10-2627-MATH-REQ001-DIAG-008": {
        "expected_conclusion": "root 3 is irrational.",
        "required_reasoning": [
            "Assume for contradiction that root 3 = a/b with integers a, b, b non-zero, and a/b in lowest terms (equivalently a and b co-prime).",
            "Square and clear denominators to obtain a^2 = 3 b^2.",
            "Apply the lemma: if the prime 3 divides a^2 then 3 divides a; write a = 3c.",
            "Substitute to obtain 3 b^2 = 9 c^2, hence b^2 = 3 c^2, so 3 divides b.",
            "State the contradiction: 3 is a common factor of a and b, contradicting lowest terms / co-primality.",
            "Conclude that no such a, b exist, so root 3 is irrational.",
        ],
        "acceptable_equivalents": [
            "Use of 'co-prime' instead of 'in lowest terms'.",
            "Use of p, q instead of a, b.",
            "Stating the prime-divides lemma as a consequence of the Fundamental Theorem of Arithmetic without proving it.",
            "Deriving 3 | b from b^2 = 3c^2 by the same lemma applied to b.",
        ],
        "terminology": ["irrational", "rational", "co-prime / lowest terms", "contradiction", "prime"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Asserting 'root 3 is not a perfect square therefore irrational' with no argument.",
            "Deducing 3 | a directly from 3 | a^2 without invoking primality (false for composite divisors, e.g. 4 | 2^2 but 4 does not divide 2).",
            "Omitting the co-primality assumption, which removes the contradiction.",
            "Stopping at a^2 = 3b^2 without reaching a contradiction.",
        ],
        "minimum_passing_evidence": [
            "Contradiction hypothesis stated with co-primality.",
            "Equation a^2 = 3 b^2 derived.",
            "3 shown to divide both a and b.",
            "Explicit contradiction and conclusion of irrationality.",
        ],
    },
    "C10-2627-MATH-REQ001-REASS-011": {
        "expected_conclusion": "root 7 is irrational.",
        "required_reasoning": [
            "Assume root 7 = a/b with a, b integers, b non-zero and a, b co-prime.",
            "Square to obtain a^2 = 7 b^2.",
            "Use the prime lemma to conclude 7 divides a; set a = 7c.",
            "Substitute to obtain b^2 = 7 c^2, so 7 divides b.",
            "Contradiction with co-primality; therefore root 7 is irrational.",
        ],
        "acceptable_equivalents": [
            "Any prime-specific wording of the same contradiction argument.",
            "Citing the Fundamental Theorem of Arithmetic for the divisibility lemma.",
        ],
        "terminology": ["irrational", "co-prime", "prime", "contradiction"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Reusing the root 2 proof verbatim without changing the prime.",
            "Applying the lemma to a non-prime divisor.",
            "No explicit contradiction statement.",
        ],
        "minimum_passing_evidence": [
            "Co-prime assumption.",
            "a^2 = 7 b^2 derived.",
            "7 | a and 7 | b both established.",
            "Contradiction and conclusion stated.",
        ],
    },
    "C10-2627-MATH-REQ001-REASS-020": {
        "expected_conclusion": "7 root 2 is irrational.",
        "required_reasoning": [
            "Assume for contradiction that 7 root 2 = r is rational.",
            "Divide by the non-zero rational 7: root 2 = r/7.",
            "A quotient of two rationals with non-zero denominator is rational, so root 2 would be rational.",
            "This contradicts the given fact that root 2 is irrational.",
            "Therefore 7 root 2 is irrational.",
        ],
        "acceptable_equivalents": [
            "Writing r = p/q and concluding root 2 = p/(7q).",
            "Arguing from closure of the rationals under division by a non-zero rational.",
        ],
        "terminology": ["rational", "irrational", "contradiction", "closure"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Claiming 'rational times irrational is always irrational' without noting the multiplier must be non-zero.",
            "Re-proving the irrationality of root 2 instead of using the given.",
        ],
        "minimum_passing_evidence": [
            "Contradiction hypothesis stated.",
            "root 2 expressed as a quotient of rationals.",
            "Contradiction with the given and conclusion.",
        ],
    },
    "C10-2627-MATH-REQ001-REASS-018": {
        "expected_conclusion": "a",
        "required_reasoning": [
            "The blank completes the standard lemma: if a prime p divides a^2 then p divides a.",
        ],
        "acceptable_equivalents": ["a", "the number a", "a itself"],
        "terminology": ["prime", "divides"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Answering 'a^2'.",
            "Answering 'p' or 'any integer'.",
            "Generalising the lemma to composite p.",
        ],
        "minimum_passing_evidence": ["The single token 'a' (case-insensitive, punctuation ignored)."],
    },
    "C10-2627-MATH-REQ001-DIAG-013": {
        "expected_conclusion": "The student is not correct; root(9/4) = 3/2, which is rational.",
        "required_reasoning": [
            "Reject the student's general claim: a radical sign does not by itself make a number irrational.",
            "Evaluate root(9/4) = root 9 / root 4 = 3/2.",
            "Classify 3/2 as rational because it is a ratio of two integers with non-zero denominator.",
        ],
        "acceptable_equivalents": ["1.5 accepted alongside 3/2", "'No' / 'incorrect' / 'false' for the judgement"],
        "terminology": ["rational", "irrational", "perfect square"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Agreeing with the student.",
            "Giving 3/2 but still calling it irrational.",
            "Giving only the value without the classification, or only the classification without the value.",
        ],
        "minimum_passing_evidence": [
            "Explicit rejection of the claim.",
            "Value 3/2 (or 1.5).",
            "Classification as rational.",
        ],
    },
    "C10-2627-MATH-REQ001-DIAG-014": {
        "expected_conclusion": "4, rational",
        "required_reasoning": [
            "root 2 x root 8 = root 16.",
            "root 16 = 4.",
            "4 is an integer, hence rational.",
        ],
        "acceptable_equivalents": ["'+4' or '4.0' for the first blank", "'a rational number' for the second blank"],
        "terminology": ["rational", "irrational", "product"],
        "units": None,
        "tolerance": {"numeric_exact": True},
        "common_mistakes": [
            "Answering 'root 16' without evaluating.",
            "Marking the product irrational because both factors are irrational.",
            "Filling only one of the two blanks.",
        ],
        "minimum_passing_evidence": ["Both blanks filled.", "First blank equals 4.", "Second blank says rational."],
    },
    "C10-2627-MATH-REQ001-REASS-016": {
        "expected_conclusion": "The number is irrational.",
        "required_reasoning": [
            "Observe that the decimal expansion never terminates.",
            "Observe that no block of digits repeats periodically, because the run of 1s grows by one each time.",
            "Apply the criterion: a rational number has a terminating or eventually recurring decimal expansion.",
            "Conclude the number is irrational.",
        ],
        "acceptable_equivalents": [
            "'non-terminating non-repeating' / 'non-recurring' / 'never periodic' are equivalent justifications.",
        ],
        "terminology": ["non-terminating", "non-recurring / non-repeating", "rational", "irrational"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Calling the number rational because it shows a visible pattern (a pattern is not a repeating block).",
            "Stating 'irrational' with no justification.",
            "Justifying only by 'non-terminating', which is insufficient (1/3 is non-terminating and rational).",
        ],
        "minimum_passing_evidence": [
            "Classification as irrational.",
            "Justification citing both non-terminating and non-recurring.",
        ],
    },
    "C10-2627-MATH-REQ001-REASS-017": {
        "expected_conclusion": "A valid pair of distinct irrationals with a rational product, together with that product; e.g. root 2 and root 8 with product 4.",
        "required_reasoning": [
            "Choose two irrational numbers that are different from each other.",
            "Show or state their product.",
            "Confirm the product is rational.",
        ],
        "acceptable_equivalents": [
            "root 2 and root 8 -> 4",
            "root 3 and root 12 -> 6",
            "root 5 and root 20 -> 10",
            "(2 + root 3) and (2 - root 3) -> 1",
            "root 2 and 3 root 2 -> 6",
            "Any pair root a, root b with ab a perfect square and root a != root b.",
        ],
        "terminology": ["irrational", "rational", "product"],
        "units": None,
        "tolerance": {"numeric_exact": True},
        "common_mistakes": [
            "Giving the same irrational twice (root 2 and root 2) when the question asks for two different numbers.",
            "Giving a pair whose product is irrational.",
            "Omitting the value of the product.",
        ],
        "minimum_passing_evidence": [
            "Two distinct irrational numbers named.",
            "Their product stated.",
            "The stated product is in fact rational.",
        ],
    },
    # ------------------------------------------------------------------
    # Mathematics — Geometry / Circles
    # ------------------------------------------------------------------
    "C10-2627-MATH-REQ024-DIAG-003": {
        "expected_conclusion": "Yes, the triangles are similar, by the AA (angle-angle) criterion.",
        "required_reasoning": [
            "Use the angle sum of a triangle: third angle of the first triangle = 180 - 50 - 60 = 70 degrees.",
            "Third angle of the second triangle = 180 - 60 - 70 = 50 degrees.",
            "Both triangles therefore have the angle set {50, 60, 70} degrees.",
            "Two pairs of corresponding angles are equal, so AA similarity applies.",
        ],
        "acceptable_equivalents": ["'AAA' accepted as equivalent to AA at this level.", "'equiangular' as a justification phrase."],
        "terminology": ["similar", "AA criterion", "angle sum property", "corresponding angles"],
        "units": "degrees",
        "tolerance": {"numeric_exact": True},
        "common_mistakes": [
            "Answering 'yes' without computing the third angles.",
            "Claiming congruence rather than similarity (no side information is given).",
            "Using SAS or SSS, which need side lengths that are not supplied.",
        ],
        "minimum_passing_evidence": [
            "Both third angles computed (70 and 50 degrees).",
            "Statement that the two angle sets match.",
            "Named criterion AA.",
        ],
    },
    "C10-2627-MATH-REQ027-DIAG-003": {
        "expected_conclusion": "PA = 7 cm, because tangents drawn from an external point to a circle are equal in length.",
        "required_reasoning": [
            "Identify PA and PB as tangent segments from the common external point P.",
            "Apply the equal-tangents property, so PA = PB.",
            "Substitute PB = 7 cm to give PA = 7 cm.",
        ],
        "acceptable_equivalents": [
            "'lengths of tangents from an external point are equal' in any wording.",
            "Justification via congruent right triangles OAP and OBP (RHS) is also acceptable.",
        ],
        "terminology": ["tangent", "external point", "equal tangents", "radius"],
        "units": "cm",
        "tolerance": {"numeric_exact": True},
        "common_mistakes": [
            "Giving 7 cm without naming the property, when the question explicitly asks for it.",
            "Naming the alternate-segment or tangent-radius perpendicularity theorem instead.",
            "Assuming PA = radius.",
        ],
        "minimum_passing_evidence": ["Value 7 cm.", "The equal-tangents property named."],
    },
    # ------------------------------------------------------------------
    # Science — Life processes
    # ------------------------------------------------------------------
    "C10-2627-SCI-REQ022-REASS-001": {
        "expected_conclusion": "Diffusion alone is too slow over the large distances inside a big animal and its surface area to volume ratio is too small, so a specialised transport system is required; an amoeba is small with a high surface area to volume ratio and every part of it is close to the surrounding water.",
        "required_reasoning": [
            "State that diffusion is effective only over very short distances and is slow over long ones.",
            "Contrast surface area to volume ratio: high in a unicellular organism, low in a large body.",
            "Note that in a large animal most cells are far from the body surface.",
            "Conclude the need for respiratory and circulatory transport systems.",
        ],
        "acceptable_equivalents": [
            "'surface area : volume ratio' or 'surface-to-volume ratio'.",
            "'transport system', 'circulatory system', 'blood' as the required specialisation.",
        ],
        "terminology": ["diffusion", "surface area to volume ratio", "multicellular", "transport system"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Only saying 'the animal is big' with no mechanism.",
            "Confusing diffusion with active transport.",
            "Claiming diffusion does not occur at all in large animals (it does, over short distances such as across the alveolar wall).",
        ],
        "minimum_passing_evidence": [
            "Distance / rate limitation of diffusion stated.",
            "Surface area to volume contrast stated.",
            "Need for a specialised transport system stated.",
        ],
    },
    # ------------------------------------------------------------------
    # Science — Light, human eye, atmospheric optics
    # ------------------------------------------------------------------
    "C10-2627-SCI-REQ037-REASS-004": {
        "expected_conclusion": "A convex mirror always forms an erect (virtual, diminished) image and gives a much wider field of view than a plane mirror of the same size.",
        "required_reasoning": [
            "State that a convex mirror diverges reflected rays.",
            "Reason 1: the image is always virtual, erect and diminished, so the driver sees an upright image.",
            "Reason 2: because the image is diminished, a wider field of view fits in the same mirror area.",
        ],
        "acceptable_equivalents": ["'larger field of view', 'sees more traffic behind', 'wider view' for reason 2."],
        "terminology": ["convex mirror", "virtual", "erect", "diminished", "field of view"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Claiming the image is real.",
            "Claiming the image is magnified.",
            "Giving only one reason when two are required.",
        ],
        "minimum_passing_evidence": ["Two distinct reasons.", "At least one refers to erect/virtual image formation.", "At least one refers to wider field of view."],
    },
    "C10-2627-SCI-REQ037-REASS-009": {
        "expected_conclusion": "Refraction of light; rays leaving the denser water bend away from the normal, so the coin's image is formed above its real position and it appears raised.",
        "required_reasoning": [
            "Name the phenomenon as refraction (apparent depth).",
            "State the direction of bending: from denser to rarer medium, the ray bends away from the normal.",
            "State that the eye extrapolates the emergent rays backwards in straight lines.",
            "Conclude the image lies nearer the surface than the coin, so the coin appears raised.",
        ],
        "acceptable_equivalents": ["'apparent depth is less than real depth' is an acceptable concluding statement."],
        "terminology": ["refraction", "normal", "denser medium", "rarer medium", "apparent depth"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Naming reflection, dispersion or total internal reflection.",
            "Saying the ray bends towards the normal on leaving water.",
            "Naming refraction without any explanation of the apparent rise.",
        ],
        "minimum_passing_evidence": ["Phenomenon named as refraction.", "Correct bending direction.", "Link to the apparent raised position."],
    },
    "C10-2627-SCI-REQ039-DIAG-003": {
        "expected_conclusion": "Air molecules scatter shorter (blue) wavelengths far more strongly than longer (red) wavelengths, so scattered blue light reaches the eye from all parts of the sky.",
        "required_reasoning": [
            "Identify the mechanism as scattering of sunlight by molecules much smaller than the wavelength (Rayleigh scattering).",
            "State the wavelength dependence: shorter wavelengths are scattered much more strongly.",
            "Conclude that the scattered light reaching the observer from the whole sky is predominantly blue.",
        ],
        "acceptable_equivalents": [
            "'scattering is inversely proportional to the fourth power of the wavelength' if quoted correctly.",
            "'blue light has a shorter wavelength than red' as the wavelength statement.",
        ],
        "terminology": ["scattering", "wavelength", "Rayleigh scattering", "air molecules"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Attributing the colour to reflection from the sea.",
            "Attributing it to dispersion or refraction rather than scattering.",
            "Saying red is scattered more than blue.",
        ],
        "minimum_passing_evidence": ["Scattering named.", "Shorter wavelength scattered more, stated correctly.", "Conclusion that the sky looks blue."],
    },
    "C10-2627-SCI-REQ039-REASS-006": {
        "expected_conclusion": "Near the horizon sunlight travels a much longer path through the atmosphere; most of the shorter blue wavelengths are scattered out of the beam, so mainly red light reaches the observer.",
        "required_reasoning": [
            "State that the path length through the atmosphere is greatest at sunrise and sunset.",
            "State that short wavelengths are scattered out of the direct beam along that long path.",
            "Conclude that the transmitted beam is dominated by longer red wavelengths.",
        ],
        "acceptable_equivalents": ["'light has to travel a greater thickness of air' for the path-length statement."],
        "terminology": ["scattering", "wavelength", "atmosphere", "path length"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Attributing the colour to the sun being cooler or nearer at sunset.",
            "Omitting the longer atmospheric path.",
            "Saying red is scattered most.",
        ],
        "minimum_passing_evidence": ["Longer path stated.", "Preferential scattering of blue stated.", "Red dominance concluded."],
    },
    "C10-2627-SCI-REQ039-REASS-007": {
        "expected_conclusion": "Stars twinkle because they are effectively point sources whose light is refracted by continuously changing layers of air; planets are extended sources whose many point images average out, so they shine steadily.",
        "required_reasoning": [
            "Attribute twinkling to atmospheric refraction that varies with time as air layers move.",
            "Describe a star as a point source, so its apparent position and brightness fluctuate.",
            "Describe a planet as an extended source (collection of point sources) whose fluctuations cancel out.",
        ],
        "acceptable_equivalents": ["'nearer to the Earth so it appears as a disc' is acceptable as part of the extended-source argument."],
        "terminology": ["atmospheric refraction", "point source", "extended source", "twinkling"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Saying stars twinkle because their own brightness changes.",
            "Attributing the effect to reflection or scattering rather than refraction.",
            "Explaining the star but not the planet.",
        ],
        "minimum_passing_evidence": ["Atmospheric refraction named.", "Point-source description of a star.", "Extended-source averaging for a planet."],
    },
    "C10-2627-SCI-REQ039-REASS-009": {
        "expected_conclusion": "Refraction, internal reflection and dispersion of sunlight inside the water droplets.",
        "required_reasoning": [
            "Sunlight refracts on entering the droplet and is dispersed into its constituent colours.",
            "The light is internally reflected at the back surface of the droplet.",
            "It refracts again on leaving, so the separated colours emerge in different directions.",
        ],
        "acceptable_equivalents": [
            "'total internal reflection' accepted for 'internal reflection'.",
            "Order of naming the three effects is not marked.",
        ],
        "terminology": ["refraction", "dispersion", "internal reflection", "water droplets"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Naming scattering as one of the three effects.",
            "Naming only two effects.",
            "Naming diffraction or interference.",
        ],
        "minimum_passing_evidence": ["All three effects named: refraction, internal reflection, dispersion."],
    },
    "C10-2627-SCI-REQ039-REASS-002": {
        "expected_conclusion": "Presbyopia is the age-related loss of accommodation (the near point recedes); a bifocal lens is prescribed because its concave upper portion corrects distant vision while its convex lower portion corrects near vision.",
        "required_reasoning": [
            "Define presbyopia as an age-related defect caused by weakening ciliary muscles and a less flexible eye lens.",
            "State the consequence: the near point moves away, so near vision is lost, and distant vision may also be defective.",
            "Explain that a bifocal lens contains two powers in one lens.",
            "Identify concave (upper) for distant vision and convex (lower) for near vision.",
        ],
        "acceptable_equivalents": ["'diverging' for concave and 'converging' for convex."],
        "terminology": ["presbyopia", "accommodation", "near point", "bifocal", "concave", "convex"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Confusing presbyopia with hypermetropia (presbyopia is specifically age-related loss of accommodation).",
            "Swapping the two halves of the bifocal lens.",
            "Defining presbyopia but not explaining the bifocal prescription.",
        ],
        "minimum_passing_evidence": ["Correct definition including loss of accommodation with age.", "Both lens portions named with the vision each corrects."],
    },
    "C10-2627-SCI-REQ039-REASS-004": {
        "expected_conclusion": "Myopia (short-sightedness), corrected with a concave (diverging) lens.",
        "required_reasoning": [
            "Read the symptom pattern: near vision normal, distant vision blurred.",
            "Name the defect as myopia.",
            "State that in myopia the image of a distant object forms in front of the retina.",
            "State that a concave lens diverges the incoming rays so the image moves back onto the retina.",
        ],
        "acceptable_equivalents": ["'short-sightedness' / 'near-sightedness' for myopia.", "'diverging lens' for concave lens."],
        "terminology": ["myopia", "concave lens", "retina", "far point"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Naming hypermetropia (the opposite defect).",
            "Prescribing a convex lens.",
            "Naming the defect and lens with no reason, when a reason is demanded.",
        ],
        "minimum_passing_evidence": ["Defect named as myopia.", "Concave lens named.", "Reason referring to the image forming in front of the retina."],
    },
    # ------------------------------------------------------------------
    # Science — Effects of current
    # ------------------------------------------------------------------
    "C10-2627-SCI-REQ042-REASS-004": {
        "expected_conclusion": "The element alloy has high resistivity and a high melting point so it produces and withstands the heat; copper has very low resistivity so the connecting cable dissipates almost no heat.",
        "required_reasoning": [
            "Quote or use the heating relation H = I^2 R t.",
            "Because the current is the same in series, the higher-resistance element dissipates far more heat.",
            "The alloy's high melting point lets it glow without melting.",
            "Copper's low resistivity keeps cable heating negligible and safe.",
        ],
        "acceptable_equivalents": ["'Joule's law of heating' cited by name.", "'nichrome' as the alloy example."],
        "terminology": ["resistivity", "melting point", "Joule heating", "H = I^2 R t"],
        "units": "ohm metre for resistivity; joule for heat",
        "tolerance": None,
        "common_mistakes": [
            "Saying copper is used because it is cheap only.",
            "Claiming the alloy has low resistance.",
            "Omitting the melting-point reason.",
        ],
        "minimum_passing_evidence": ["Heating relation used or clearly implied.", "High resistivity and high melting point of the alloy.", "Low resistivity of copper."],
    },
    "C10-2627-SCI-REQ043-DIAG-001": {
        "expected_conclusion": "Right-hand thumb rule: grasp the wire in the right hand with the thumb along the current; the curled fingers give the field direction. For a vertically upward current the field lines are concentric circles around the wire, anticlockwise when seen from above.",
        "required_reasoning": [
            "State the rule with thumb along the current and curled fingers giving the field.",
            "Describe the field pattern as concentric circles in planes perpendicular to the wire.",
            "Apply the rule to an upward current viewed from above to obtain the anticlockwise sense.",
        ],
        "acceptable_equivalents": ["'Maxwell's corkscrew rule' accepted as an equivalent rule if stated correctly.", "'counter-clockwise' for anticlockwise."],
        "terminology": ["right-hand thumb rule", "magnetic field lines", "concentric circles", "anticlockwise"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Giving clockwise as seen from above.",
            "Describing straight field lines parallel to the wire.",
            "Stating the rule but not applying it to the given direction.",
        ],
        "minimum_passing_evidence": ["Rule stated correctly.", "Concentric circular field pattern.", "Anticlockwise sense from above."],
    },
    "C10-2627-SCI-REQ043-DIAG-003": {
        "expected_conclusion": "Hold the thumb, forefinger and middle finger of the left hand mutually perpendicular: forefinger = magnetic field, middle finger = current, thumb = force (motion).",
        "required_reasoning": [
            "State that the three fingers of the left hand are held mutually perpendicular.",
            "Assign field to the forefinger.",
            "Assign current to the middle (central) finger.",
            "Assign force or direction of motion to the thumb.",
        ],
        "acceptable_equivalents": ["'motion' accepted for 'force'.", "'central finger' for 'middle finger'."],
        "terminology": ["Fleming's left-hand rule", "magnetic field", "current", "force"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Using the right hand (that is Fleming's right-hand rule, for induced current).",
            "Swapping the field and current fingers.",
            "Omitting the mutually perpendicular condition.",
        ],
        "minimum_passing_evidence": ["Left hand specified.", "All three assignments correct.", "Mutually perpendicular arrangement stated."],
    },
    "C10-2627-SCI-REQ043-REASS-001": {
        "expected_conclusion": "Inside a long current-carrying solenoid the field is uniform, straight and parallel to the axis, like that of a bar magnet; the arrangement is used to make an electromagnet (for example by inserting a soft iron core).",
        "required_reasoning": [
            "Describe the interior field lines as straight, parallel and equally spaced, i.e. uniform.",
            "Compare the external pattern with that of a bar magnet.",
            "Give one use: electromagnet, electric bell, relay, loudspeaker or magnetising a steel rod.",
        ],
        "acceptable_equivalents": ["Any one valid use is sufficient.", "'solenoid behaves like a bar magnet' as the comparison."],
        "terminology": ["solenoid", "uniform magnetic field", "bar magnet", "electromagnet", "soft iron core"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Describing the interior field as circular.",
            "Saying the field is strongest at the centre of the axis and zero elsewhere inside.",
            "Omitting the use.",
        ],
        "minimum_passing_evidence": ["Uniform axial field described.", "One valid use stated."],
    },
    "C10-2627-SCI-REQ043-REASS-004": {
        "expected_conclusion": "It establishes that a current-carrying conductor produces a magnetic field around it; reversing the current reverses the direction of the needle's deflection.",
        "required_reasoning": [
            "Interpret the deflection as evidence of a magnetic field produced by the current (Oersted's observation).",
            "Note that the field direction follows the right-hand thumb rule.",
            "Conclude that reversing the current reverses the field and therefore the deflection.",
        ],
        "acceptable_equivalents": ["'Oersted's experiment' named explicitly.", "'needle deflects the other way' for the reversal."],
        "terminology": ["magnetic field", "current-carrying conductor", "deflection", "right-hand thumb rule"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Claiming the wire becomes permanently magnetised.",
            "Saying the deflection merely increases when current is reversed.",
            "Answering only one of the two parts.",
        ],
        "minimum_passing_evidence": ["Conclusion that current produces a magnetic field.", "Statement that reversal reverses the deflection."],
    },
    "C10-2627-SCI-REQ043-REASS-006": {
        "expected_conclusion": "A fuse melts and breaks the circuit when the current exceeds a safe value; the fuse wire is chosen for its low melting point (and suitable resistance / thin cross-section).",
        "required_reasoning": [
            "State the protective function: it interrupts the circuit on overload or short circuit.",
            "Relate the heating to H = I^2 R t, so a large current heats the thin wire rapidly.",
            "Identify the required property: low melting point with appropriate resistance, so it melts before the wiring or appliance is damaged.",
        ],
        "acceptable_equivalents": ["'tin-lead alloy' cited as the material.", "'high resistivity, low melting point' for the property."],
        "terminology": ["fuse", "overload", "short circuit", "melting point", "Joule heating"],
        "units": "ampere for the rating",
        "tolerance": None,
        "common_mistakes": [
            "Saying the fuse reduces the current rather than breaking the circuit.",
            "Claiming a high melting point is required.",
            "Confusing a fuse with an earth wire.",
        ],
        "minimum_passing_evidence": ["Function of breaking the circuit on excess current.", "Low melting point named as the property."],
    },
    "C10-2627-SCI-REQ043-REASS-007": {
        "expected_conclusion": "The force on the conductor acts towards the east.",
        "required_reasoning": [
            "Set the forefinger (field) pointing vertically downwards.",
            "Set the middle finger (current) pointing from north to south.",
            "Read the thumb: it points towards the east.",
        ],
        "acceptable_equivalents": ["'eastwards' / 'to the east' / 'horizontally east'."],
        "terminology": ["Fleming's left-hand rule", "magnetic field", "current", "force"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Answering west (fingers assigned in reverse).",
            "Answering upwards or downwards.",
            "Using the right hand.",
        ],
        "minimum_passing_evidence": ["Direction stated as east.", "Correct finger assignment shown or described."],
    },
    "C10-2627-SCI-REQ043-REASS-009": {
        "expected_conclusion": "Each appliance receives the full supply voltage, and each can be switched on or off independently without affecting the others.",
        "required_reasoning": [
            "In parallel the potential difference across every branch equals the supply voltage, so appliances work at their rated voltage.",
            "Each branch carries its own current, so a switch or a fault in one branch does not interrupt the others.",
        ],
        "acceptable_equivalents": [
            "'appliances draw the current they need' as part of the first reason.",
            "'if one appliance fails the rest keep working' for the second reason.",
        ],
        "terminology": ["parallel", "potential difference", "supply voltage", "independent switching"],
        "units": "volt",
        "tolerance": None,
        "common_mistakes": [
            "Giving series-circuit advantages.",
            "Claiming parallel connection reduces the total current drawn from the mains.",
            "Giving only one reason.",
        ],
        "minimum_passing_evidence": ["Two distinct valid reasons.", "One reason refers to equal/full voltage."],
    },
    # ------------------------------------------------------------------
    # Science — Our environment / natural resources
    # ------------------------------------------------------------------
    "C10-2627-SCI-REQ045-DIAG-002": {
        "expected_conclusion": "Biotic (living) components, e.g. plants, animals, microorganisms; and abiotic (non-living) components, e.g. air, water, soil, light, temperature.",
        "required_reasoning": [
            "Name the two components as biotic and abiotic.",
            "Give at least one valid example of each.",
        ],
        "acceptable_equivalents": ["'living' and 'non-living' accepted for biotic and abiotic.", "Any valid example from each class."],
        "terminology": ["biotic", "abiotic", "ecosystem"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Naming producers and consumers (these are subdivisions of the biotic component).",
            "Giving an abiotic example under biotic, e.g. 'soil' as living.",
            "Naming both components but giving no example.",
        ],
        "minimum_passing_evidence": ["Both components named.", "One valid example for each."],
    },
    "C10-2627-SCI-REQ045-DIAG-004": {
        "expected_conclusion": "Biological magnification (biomagnification); the pesticide is non-biodegradable and is not excreted, so its concentration rises at each higher trophic level.",
        "required_reasoning": [
            "Name the phenomenon as biological magnification.",
            "State that the pesticide is non-biodegradable / persistent.",
            "Explain that each consumer ingests the pollutant present in all the prey it eats but excretes very little.",
            "Conclude that concentration therefore increases with trophic level, highest in the top consumer.",
        ],
        "acceptable_equivalents": ["'biomagnification' or 'bioaccumulation along the food chain'."],
        "terminology": ["biological magnification", "non-biodegradable", "trophic level", "food chain"],
        "units": "parts per million (ppm) if quantities are quoted",
        "tolerance": None,
        "common_mistakes": [
            "Naming eutrophication.",
            "Attributing the rise to the pollutant being produced by the organisms.",
            "Naming the phenomenon with no explanation of the increase.",
        ],
        "minimum_passing_evidence": ["Phenomenon named.", "Non-degradability / non-excretion stated.", "Increase across trophic levels explained."],
    },
    "C10-2627-SCI-REQ045-DIAG-005": {
        "expected_conclusion": "Only about ten per cent of the energy passes to the next trophic level, so after three or four levels too little energy remains to support another level.",
        "required_reasoning": [
            "State the ten per cent law of energy transfer.",
            "State that the remaining energy is lost as heat and used in life processes.",
            "Conclude that available energy falls rapidly, limiting the chain length.",
        ],
        "acceptable_equivalents": ["'Lindeman's ten per cent law' named explicitly.", "'about 10%' or 'only a tenth'."],
        "terminology": ["trophic level", "ten per cent law", "energy transfer", "food chain"],
        "units": "per cent",
        "tolerance": {"percentage_point": 0},
        "common_mistakes": [
            "Quoting 90 per cent as the amount transferred.",
            "Saying there are not enough organisms, without the energy argument.",
            "Claiming energy is recycled like nutrients.",
        ],
        "minimum_passing_evidence": ["Ten per cent transfer stated.", "Conclusion linking energy loss to the limited number of levels."],
    },
    "C10-2627-SCI-REQ045-DIAG-008": {
        "expected_conclusion": "Ultraviolet radiation splits O2 into free oxygen atoms which combine with O2 to form O3; the ozone layer is important because it absorbs most of the harmful ultraviolet radiation reaching the Earth.",
        "required_reasoning": [
            "State that high-energy UV dissociates molecular oxygen into atomic oxygen.",
            "State that atomic oxygen combines with O2 to give O3.",
            "State the protective role: absorption of harmful UV radiation.",
            "Optionally name a consequence of UV exposure such as skin cancer or crop damage.",
        ],
        "acceptable_equivalents": ["Equations O2 -> O + O and O + O2 -> O3 in place of prose."],
        "terminology": ["ozone", "ultraviolet radiation", "stratosphere / upper atmosphere", "dissociation"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Saying ozone is formed from carbon dioxide.",
            "Placing ozone formation in the troposphere as the protective layer.",
            "Describing the importance without the formation mechanism, or the reverse.",
        ],
        "minimum_passing_evidence": ["Both formation steps stated.", "Protective UV-absorbing role stated."],
    },
    "C10-2627-SCI-REQ045-DIAG-009": {
        "expected_conclusion": "Chlorofluorocarbons (CFCs); formerly used as refrigerants and as aerosol spray propellants, now restricted.",
        "required_reasoning": [
            "Name the class of chemicals as chlorofluorocarbons.",
            "Give one formerly common use now restricted: refrigerant or aerosol propellant (also foam blowing, fire extinguishers).",
        ],
        "acceptable_equivalents": ["'CFC' abbreviation accepted.", "'coolant in refrigerators and air conditioners'."],
        "terminology": ["chlorofluorocarbon", "ozone depletion", "refrigerant", "propellant"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Naming carbon dioxide or methane (greenhouse gases, not ozone depleters).",
            "Naming the class but giving no restricted use.",
            "Claiming CFCs are biodegradable.",
        ],
        "minimum_passing_evidence": ["CFCs named.", "One valid restricted use stated."],
    },
    "C10-2627-SCI-REQ045-DIAG-011": {
        "expected_conclusion": "Segregate waste at source into biodegradable and non-biodegradable fractions; the biodegradable part can be composted and the rest recycled, so far less material rots in the landfill and the drains stay clear.",
        "required_reasoning": [
            "Propose one practical change, most directly segregation at source (composting or separate dry-waste collection also acceptable).",
            "Explain the mechanism: organic waste is composted instead of rotting in mixed landfill, so odour falls.",
            "Explain the second effect: recyclables are diverted, so less waste chokes drains and the landfill.",
        ],
        "acceptable_equivalents": [
            "'two-bin system', 'wet and dry waste separation', 'community composting pit' as the proposed change.",
        ],
        "terminology": ["biodegradable", "non-biodegradable", "segregation", "composting", "recycling"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Suggesting burning the waste (creates air pollution; not acceptable).",
            "Naming the change without explaining how it helps.",
            "Proposing a change that does not address the stated stench and choked drains.",
        ],
        "minimum_passing_evidence": ["One practical change stated.", "Explanation linking the change to reduced rotting waste or clearer drains."],
    },
    "C10-2627-SCI-REQ045-DIAG-012": {
        "expected_conclusion": "Two valid harms, e.g. it persists for decades and enters food chains causing biological magnification; and it chokes drains and soil and injures or kills animals that swallow it.",
        "required_reasoning": [
            "State that microorganisms cannot break the material down, so it persists.",
            "Give two distinct consequences from: food-chain entry and biomagnification, drain and soil blockage, harm to animals, loss of soil fertility, leachate pollution of groundwater.",
        ],
        "acceptable_equivalents": ["Any two distinct valid harms are accepted."],
        "terminology": ["non-biodegradable", "persistence", "biological magnification", "food chain"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Giving the same harm twice in different words.",
            "Listing harms of biodegradable waste instead.",
            "Only stating 'it causes pollution' with no mechanism.",
        ],
        "minimum_passing_evidence": ["Two distinct harmful effects.", "At least one linked to persistence or the food chain."],
    },
    "C10-2627-SCI-REQ045-REASS-002": {
        "expected_conclusion": "A food chain is a single linear sequence of organisms in which each eats the one before it; a food web is the network formed by many interlinked food chains; the web's advantage is that it offers alternative food sources and so makes the ecosystem more stable.",
        "required_reasoning": [
            "Define a food chain as linear and single-pathway.",
            "Define a food web as interconnected chains forming a network.",
            "Give one advantage of the web: alternative food, resilience to loss of one species, greater stability.",
        ],
        "acceptable_equivalents": ["'many chains linked together' for the web definition.", "'more stable' / 'less vulnerable' for the advantage."],
        "terminology": ["food chain", "food web", "trophic level", "stability"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Defining a food web as simply a longer food chain.",
            "Giving definitions but no advantage.",
            "Claiming a food chain is more stable.",
        ],
        "minimum_passing_evidence": ["Both definitions distinct and correct.", "One advantage of the web stated."],
    },
    "C10-2627-SCI-REQ045-REASS-004": {
        "expected_conclusion": "The birds (the top consumers) are at greatest risk, because the pollutant is non-biodegradable and undergoes biological magnification.",
        "required_reasoning": [
            "Read the trend in the quoted concentrations: 0.02, then 0.5, then 8 parts per million.",
            "Identify the highest trophic level present, the fish-eating birds, as the most affected.",
            "Attribute the pattern to the pollutant being non-biodegradable and retained in tissues.",
            "Name biological magnification.",
        ],
        "acceptable_equivalents": ["'top carnivore' or 'tertiary consumer' for the birds."],
        "terminology": ["trophic level", "biological magnification", "non-biodegradable", "parts per million"],
        "units": "parts per million (ppm)",
        "tolerance": {"numeric_exact": True},
        "common_mistakes": [
            "Naming the water or the producers as most at risk.",
            "Naming the birds but attributing the rise to the birds' own metabolism producing the metal.",
            "Omitting the non-biodegradable property.",
        ],
        "minimum_passing_evidence": ["Birds identified.", "Non-biodegradability stated.", "Biological magnification named or clearly described."],
    },
    "C10-2627-SCI-REQ045-REASS-006": {
        "expected_conclusion": "Dead organisms and wastes would accumulate and nutrients would not be returned to the soil, so the nutrient cycle would break and producers, and eventually the whole ecosystem, would fail.",
        "required_reasoning": [
            "State the role of decomposers: breaking down dead organic matter.",
            "State the consequence of their removal: accumulation of dead remains and wastes.",
            "State the nutrient-cycle consequence: nutrients stay locked up and the soil is not replenished.",
            "Conclude that plant growth, and so the ecosystem, collapses.",
        ],
        "acceptable_equivalents": ["'nutrient recycling stops' for the cycle statement.", "'saprophytes' for decomposers."],
        "terminology": ["decomposers", "nutrient cycle", "producers", "organic matter"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Saying only that 'the place would smell bad'.",
            "Claiming energy, rather than nutrients, would stop cycling (energy flows, it does not cycle).",
            "Omitting the effect on producers.",
        ],
        "minimum_passing_evidence": ["Accumulation of dead matter stated.", "Break in nutrient cycling stated.", "Consequence for producers or the ecosystem stated."],
    },
    "C10-2627-SCI-REQ045-REASS-011": {
        "expected_conclusion": "The chlorine atom reacts with ozone to give chlorine monoxide and oxygen and is regenerated in a following step, so acting as a catalyst it destroys very many ozone molecules; hence the damage is out of proportion to the quantity of CFCs released.",
        "required_reasoning": [
            "State the destruction step: Cl + O3 -> ClO + O2.",
            "State the regeneration of the chlorine atom, e.g. ClO + O -> Cl + O2.",
            "Identify chlorine as a catalyst that is not consumed.",
            "Conclude that one atom destroys thousands of ozone molecules, so small releases cause large depletion.",
        ],
        "acceptable_equivalents": ["Prose description of the chain reaction accepted in place of equations.", "'chain reaction' for the catalytic cycle."],
        "terminology": ["chlorofluorocarbon", "chlorine radical / atom", "catalyst", "ozone depletion", "chlorine monoxide"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Saying the chlorine atom is used up with each ozone molecule (this removes the disproportion).",
            "Claiming CFCs react directly with ozone without UV-driven release of chlorine.",
            "Describing the reaction but not explaining the disproportionate damage.",
        ],
        "minimum_passing_evidence": ["Destruction step stated.", "Regeneration / catalytic role stated.", "Conclusion about disproportionate damage."],
    },
    "C10-2627-SCI-REQ045-REASS-012": {
        "expected_conclusion": "Biodegradable: paper, cow dung. Non-biodegradable: polythene, aluminium foil.",
        "required_reasoning": [
            "Classify each of the four items.",
            "Base the classification on whether microorganisms can decompose the material.",
        ],
        "acceptable_equivalents": ["Answers given as a two-column list or as four labelled items."],
        "terminology": ["biodegradable", "non-biodegradable", "microorganisms"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Classifying paper as non-biodegradable.",
            "Classifying aluminium foil as biodegradable because it is thin.",
            "Classifying only some of the four items.",
        ],
        "minimum_passing_evidence": ["All four items classified.", "All four classifications correct."],
    },
    "C10-2627-SCI-REQ045-REASS-014": {
        "expected_conclusion": "Two valid benefits, e.g. it reduces the volume of waste sent to landfill, and it produces compost that returns nutrients to the soil.",
        "required_reasoning": [
            "Identify that composting diverts biodegradable waste from the landfill stream.",
            "Identify the second benefit: compost recycles nutrients back to the soil (or reduces transport, methane emission and leachate).",
        ],
        "acceptable_equivalents": ["'less waste transported', 'less methane from landfill', 'natural manure instead of chemical fertiliser' all accepted."],
        "terminology": ["composting", "biodegradable", "landfill", "nutrient recycling"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Giving one benefit twice in different words.",
            "Claiming composting removes non-biodegradable waste.",
            "Giving a purely financial benefit with no environmental content.",
        ],
        "minimum_passing_evidence": ["Two distinct environmental benefits."],
    },
    "C10-2627-SCI-REQ045-REASS-015": {
        "expected_conclusion": "Because disposable plastic cutlery is non-biodegradable, it accumulates as long-lasting waste, harms animals that swallow it, and adds to landfill and drainage problems, which outweighs the convenience.",
        "required_reasoning": [
            "State that plastics are not broken down by microorganisms.",
            "State that discarded items therefore persist for decades.",
            "Give at least one concrete harm: choked drains, animal injury or death, entry into food chains, landfill load.",
            "Conclude that the long-term harm outweighs the short-term convenience.",
        ],
        "acceptable_equivalents": ["'single-use plastic' for disposable plastic cutlery.", "Any one or more of the listed harms."],
        "terminology": ["non-biodegradable", "single-use plastic", "persistence", "food chain"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Only saying 'it causes pollution' with no mechanism.",
            "Claiming plastic decomposes quickly in sunlight.",
            "Arguing only on cost grounds.",
        ],
        "minimum_passing_evidence": ["Non-biodegradability stated.", "At least one specific environmental harm.", "Conclusion weighing harm against convenience."],
    },
    "C10-2627-SCI-REQ045-REASS-020": {
        "expected_conclusion": "Two valid municipal measures, e.g. enforce segregation at source with separate dry-waste collection, and set up recycling or buy-back arrangements for plastics, glass and metal.",
        "required_reasoning": [
            "Propose measures that are within a municipality's power.",
            "Explain, at least briefly, that separate collection keeps recyclables out of the mixed stream.",
            "Explain that organised recycling returns materials to industry instead of the landfill.",
        ],
        "acceptable_equivalents": [
            "'ban or restrict single-use plastics', 'awareness campaigns', 'extended producer responsibility', 'deposit-refund scheme' all accepted as valid measures.",
        ],
        "terminology": ["segregation at source", "recycling", "non-biodegradable", "landfill"],
        "units": None,
        "tolerance": None,
        "common_mistakes": [
            "Suggesting open burning or dumping in a water body.",
            "Suggesting measures only individuals, not a municipality, can take.",
            "Giving one measure when two are required.",
        ],
        "minimum_passing_evidence": ["Two distinct municipal measures.", "At least one refers to segregation or recycling."],
    },
}

assert len(SPECS) == 42, f"expected 42 marking specifications, found {len(SPECS)}"
