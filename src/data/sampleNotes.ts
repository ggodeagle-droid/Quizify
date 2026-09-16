export interface SampleNote {
  id: string;
  title: string;
  subject: string;
  category: string;
  preview: string;
  content: string;
}

export const SAMPLE_NOTES: SampleNote[] = [
  {
    id: 'biology-cell-respiration',
    title: 'Cellular Respiration & ATP Synthesis',
    subject: 'Biology (Class 11-12 / NEET)',
    category: 'Life Sciences',
    preview: 'Glycolysis, Krebs cycle, and electron transport chain ATP yield...',
    content: `CELLULAR RESPIRATION & ENERGY METABOLISM

1. Overview:
Cellular respiration is the biochemical process by which eukaryotic cells break down glucose to yield adenosine triphosphate (ATP). The overall equation is:
C6H12O6 + 6O2 -> 6CO2 + 6H2O + 36-38 ATP.

2. Stage 1: Glycolysis
- Location: Cytoplasm (cytosol). Does NOT require oxygen (anaerobic).
- Input: 1 molecule of Glucose (6-carbon).
- Output: 2 molecules of Pyruvate (3-carbon), net 2 ATP (via substrate-level phosphorylation), and 2 NADH.
- Key enzyme: Phosphofructokinase (PFK), which acts as the major regulatory pacemaker inhibited by high ATP levels.

3. Link Reaction (Pyruvate Oxidation):
- Location: Mitochondrial matrix.
- Pyruvate is decarboxylated by Pyruvate Dehydrogenase complex to form Acetyl-CoA (2-carbon), releasing 1 CO2 and producing 1 NADH per pyruvate (2 NADH per glucose).

4. Stage 2: Krebs Cycle (Citric Acid Cycle / TCA Cycle):
- Location: Mitochondrial matrix.
- Acetyl-CoA combines with Oxaloacetate (4C) to form Citrate (6C).
- Per turn (2 turns per glucose): Produces 2 CO2, 3 NADH, 1 FADH2, and 1 ATP/GTP.
- Total per glucose: 4 CO2, 6 NADH, 2 FADH2, 2 ATP.

5. Stage 3: Oxidative Phosphorylation & Electron Transport Chain (ETC):
- Location: Inner mitochondrial membrane (cristae).
- High-energy electrons from NADH and FADH2 are transferred across Complexes I, II, III, and IV.
- Oxygen serves as the final electron acceptor, combining with protons to form water (H2O).
- Protons (H+) are pumped into the intermembrane space, creating an electrochemical proton gradient (proton motive force).
- ATP Synthase utilizes this chemiosmotic gradient to phosphorylate ADP into ATP.
- 1 NADH yields approx. 2.5-3 ATP; 1 FADH2 yields approx. 1.5-2 ATP.

6. Fermentation:
- In anaerobic conditions, cells undergo lactic acid fermentation (e.g. human skeletal muscle during intense exercise) or alcoholic fermentation (yeast), regenerating NAD+ so glycolysis can continue generating 2 ATP.`
  },
  {
    id: 'physics-newton-laws',
    title: "Newton's Laws of Motion & Momentum",
    subject: 'Physics (Class 9-11 / JEE)',
    category: 'Mechanics',
    preview: 'Inertia, F=ma, action-reaction pairs, and impulse conservation...',
    content: `NEWTON'S LAWS OF MOTION & LINEAR MOMENTUM

1. Newton's First Law (Law of Inertia):
An object remains in a state of rest or uniform motion in a straight line unless acted upon by a non-zero net external force.
- Inertia is the intrinsic resistance of an object to changes in its state of motion. Mass is the quantitative measure of inertia (SI unit: kg).

2. Newton's Second Law:
The rate of change of linear momentum of a body is directly proportional to the applied net external force and occurs in the direction of the force.
- Mathematical formulation: F_net = dp/dt.
- For constant mass: F = m * a (Force in Newtons, N = kg*m/s^2).
- Momentum (p) is a vector defined as p = m * v.
- Impulse (J) is defined as force applied over time: J = Integral(F dt) = Delta p (Impulse-Momentum Theorem).

3. Newton's Third Law:
To every action, there is always an equal and opposite reaction.
- If body A exerts force F_AB on body B, then body B exerts force F_BA = -F_AB on body A.
- Action and reaction forces act on two DIFFERENT bodies, so they never cancel each other out.

4. Law of Conservation of Linear Momentum:
In an isolated system where no external net force acts (F_ext = 0), the total linear momentum remains conserved before and after collisions:
m1*u1 + m2*u2 = m1*v1 + m2*v2.
- Elastic collisions: Both total momentum and kinetic energy are conserved.
- Inelastic collisions: Total momentum is conserved, but kinetic energy is converted into heat/sound/deformation.
- Perfectly inelastic collision: The two colliding objects stick together and move with a shared final velocity.`
  },
  {
    id: 'chemistry-bonding',
    title: 'Chemical Bonding & Molecular Structure',
    subject: 'Chemistry (Class 10-12 / AP Chem)',
    category: 'Physical Chemistry',
    preview: 'Ionic vs covalent bonds, VSEPR theory, hybridization, and polarity...',
    content: `CHEMICAL BONDING & MOLECULAR GEOMETRY

1. Ionic vs Covalent Bonds:
- Ionic bonding occurs between metals and nonmetals through complete electron transfer, creating electrostatic attraction between cations and anions (e.g. NaCl, MgO). High melting point, conductive when molten or in aqueous solution.
- Covalent bonding occurs when two atoms share valence electron pairs to attain stable noble-gas electron configurations (Octet rule). Electronegativity difference determines polarity.

2. Octet Exceptions:
- Incomplete octet: Boron trifluoride (BF3) has 6 valence electrons around B.
- Expanded octet: Elements in Period 3 and beyond (PCl5, SF6) can accommodate 10 or 12 electrons using available empty d-orbitals.
- Odd-electron molecules: Nitric oxide (NO) has an unpaired electron.

3. VSEPR Theory (Valence Shell Electron Pair Repulsion):
Electron pairs surrounding a central atom repel each other and orient as far apart as possible to minimize repulsive forces.
- Repulsion hierarchy: Lone Pair - Lone Pair > Lone Pair - Bond Pair > Bond Pair - Bond Pair.
- Linear (2 electron pairs, 180 degrees, e.g., BeCl2, CO2).
- Trigonal planar (3 pairs, 120 degrees, e.g., BF3).
- Tetrahedral (4 bonding pairs, 109.5 degrees, e.g., CH4).
- Trigonal pyramidal (3 bonds + 1 lone pair, 107 degrees, e.g., NH3).
- Bent / Angular (2 bonds + 2 lone pairs, 104.5 degrees, e.g., H2O).

4. Hybridization:
Mixing of atomic orbitals to form new equivalent hybrid orbitals:
- sp (1 s + 1 p): Linear geometry, 50% s-character (e.g., C2H2).
- sp2 (1 s + 2 p): Trigonal planar, 33.3% s-character (e.g., C2H4).
- sp3 (1 s + 3 p): Tetrahedral, 25% s-character (e.g., CH4).

5. Intermolecular Forces:
- Hydrogen bonding: Strong dipole interaction when H is bonded directly to high electronegativity atoms (F, O, N). Explains water's abnormally high boiling point.`
  },
  {
    id: 'history-cold-war',
    title: 'The Cold War & Global Ideological Struggle',
    subject: 'History (Class 10-12 / UPSC)',
    category: 'Modern History',
    preview: 'Yalta, Truman Doctrine, Marshall Plan, Cuban Missile Crisis, and NATO...',
    content: `THE COLD WAR ERA (1945 - 1991)

1. Origins & Division of Post-War Europe:
- Following WWII, wartime allies USA (capitalist democratic) and USSR (communist Marxist-Leninist) entered a geopolitical rivalry without direct military confrontation.
- In 1946, Winston Churchill famously proclaimed that an "Iron Curtain" had descended across Europe, dividing East from West.
- Germany and Berlin were partitioned into four occupational zones (US, British, French, Soviet).

2. Key Doctrines & Policies:
- Truman Doctrine (1947): US foreign policy to provide political, military, and economic assistance to democratic nations resisting authoritarian communist subjugation (specifically Greece and Turkey).
- Containment: Strategy formulated by George F. Kennan to prevent the geographic expansion of Soviet influence.
- Marshall Plan (1948): European Recovery Program providing over $12 billion in US economic aid to rebuild Western European infrastructure and resist communist electoral appeal.

3. Military Alliances:
- NATO (North Atlantic Treaty Organization) formed in 1949 as a collective defense pact (Article 5: an attack against one is an attack against all).
- Warsaw Pact established in 1955 by the Soviet Union and seven Eastern European satellite states in response to West Germany joining NATO.

4. Major Proxy Conflicts & Flashpoints:
- Berlin Airlift (1948-1949): Western allies sustained West Berlin with 200,000+ flights after the Soviets blocked ground access routes.
- Korean War (1950-1953): North Korea supported by USSR and China fought South Korea backed by UN coalition led by USA; armistice signed at 38th parallel.
- Cuban Missile Crisis (October 1962): 13-day nuclear standoff after Soviet ballistic missiles were discovered in Cuba; resolved when USSR removed missiles in exchange for US pledging not to invade Cuba and secretly dismantling Jupiter missiles in Turkey.
- Vietnam War (1955-1975): Proxy confrontation between North Vietnam (Viet Cong) and South Vietnam.`
  }
];
