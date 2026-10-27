// Original practice questions. The first option is the key here; every paper shuffles it.
const byTopic = {
  "The_Basics_of_Amateur_Radio": [
    ["1A1","Which proposed use fits the purpose of an amateur radio licence?",["Investigating radio communication as a hobby","Coordinating paid delivery drivers","Selling advertising time on a local channel","Providing a commercial dispatch service"],"Amateur radio is for non-commercial self-training and communication. A technically suitable radio does not authorise business use."],
    ["1A2","Which sequence names the three UK amateur licence levels?",["Foundation, Intermediate, Full","Foundation, General, Professional","Novice, Intermediate, Commercial","Basic, Advanced, Maritime"],"The three levels are Foundation, Intermediate and Full. Each has its own qualification and licence conditions."],
  ],
  "Frequency_and_Wavelength": [
    ["2E7","A signal has a frequency of 15 MHz. Approximately what is its wavelength?",["20 m","5 m","15 m","45 m"],"Wavelength in metres is approximately 300 divided by frequency in MHz: 300 ÷ 15 = 20 m."],
    ["2E7","The frequency of a radio signal doubles. What happens to its wavelength in air?",["It halves","It doubles","It stays the same","It becomes four times as long"],"Radio-wave speed is essentially unchanged. In the relationship speed = frequency × wavelength, doubling frequency halves wavelength."],
  ],
  "Amateur_Radio_Bands": [
    ["1H1","Use EX307. What maximum power is listed for Foundation operation in the 2400–2450 MHz allocation?",["2 W","25 W","100 W","1 W"],"The January 2026 EX307 schedule lists 2 W here. Foundation power is not one universal value for every band.",null,true],
    ["1H1","A radio can tune to a frequency that is absent from the Foundation licence schedule. What follows?",["Its tuning range does not provide authority to transmit there","Any available mode may be transmitted there","The band plan alone grants permission there","Low-power transmission is automatically permitted there"],"Equipment capability and licence permission are different. Check the licence schedule, its status and all restrictions."],
  ],
  "Modes_and_Modulation": [
    ["3A1","What operation adds the information to a radio-frequency carrier?",["Modulation","Rectification","Screening","Impedance matching"],"Modulation varies an appropriate property of the carrier to represent the information. Amplifying or matching alone does not add the message."],
    ["3A2","In an ideal AM transmission, which carrier property follows the information signal?",["Amplitude","Propagation speed","Polarisation angle","Antenna impedance"],"AM represents information by changing carrier amplitude. FM changes instantaneous frequency instead."],
  ],
  "Getting_Your_Foundation_Licence": [
    ["1A2","A candidate has passed the Foundation examination and wants to operate under their own new call sign. What must they obtain?",["An amateur radio licence from Ofcom","A band plan from the IARU","A club membership certificate","A radio purchase receipt"],"The qualification permits an application; Ofcom issues the licence and call sign. Passing alone is not the licence."],
    ["1A3","After moving home, what should a licensee do about the address recorded on the licence?",["Give immediate notice of the change to Ofcom","Wait for the next five-year validation","Notify only the equipment supplier","Change the address only in the station log"],"Name and address changes must be notified to Ofcom promptly. Five-year validation is a separate obligation."],
  ],
  "Units_and_Symbols": [
    ["2A1","A supply label states 12 V and a meter reads 2 A. What does the 2 A reading describe?",["Electric current","Potential difference","Resistance","Electrical power"],"A means amperes, the unit of current. V is voltage, Ω resistance and W power."],
    ["2B1","Which unit belongs on the result of multiplying volts by amperes?",["Watts","Ohms","Hertz","Metres"],"Voltage multiplied by current gives power, measured in watts. The other units describe different quantities."],
  ],
  "Large_and_Small_Units": [
    ["2A1","Two devices are marked 0.4 A and 400 mA. How do these current ratings compare?",["They are equal","0.4 A is ten times larger","400 mA is ten times larger","0.4 A is one thousand times larger"],"Milli means one thousandth: 400 mA = 400/1000 A = 0.4 A. Changing the unit does not change the current."],
    ["2E7","A radio display shows 0.145 GHz. What is the same frequency in MHz?",["145 MHz","14.5 MHz","1,450 MHz","0.145 MHz"],"One GHz is 1,000 MHz, so 0.145 × 1,000 = 145 MHz."],
  ],
  "Symbols": [
    ["2A2","Which component is represented by the symbol shown?",["Cell","Resistor","Open switch","Capacitor"],"Unequal parallel plates represent a cell: the longer line denotes the positive terminal. Equal plates denote a capacitor.",{"type":"symbol","component":"cell"}],
    ["2A2","Which component is represented by the symbol shown?",["Resistor","Cell","Antenna","Open switch"],"The rectangle in a conducting path is a common resistor symbol. A diagram uses symbols to identify a component’s role.",{"type":"symbol","component":"resistor"}],
  ],
  "Current,_Conductors_and_Insulators": [
    ["2A1","Which material is normally selected to provide a good conducting path in a cable?",["Copper","Dry glass","Dry ceramic","Rubber insulation"],"Copper is a good conductor. The other materials are normally used for insulation rather than the intended current path."],
    ["2A1","Rain wets an insulating surface. What should be remembered?",["Current may flow across the wet surface","Its insulating performance must improve","It must become a permanent magnet","Its voltage becomes zero automatically"],"Moisture can provide a conducting surface path. An object that insulates when dry may not offer the same protection when wet."],
  ],
  "Batteries": [
    ["2J1","Three identical 1.5 V cells are connected in series with the same polarity. What is their total voltage?",["4.5 V","1.5 V","3 V","6 V"],"Series cell voltages add: 1.5 + 1.5 + 1.5 = 4.5 V. This is an ideal example, not a recommendation to change a device’s specified supply.",{"type":"cells","cells":3}],
    ["2J1","What supplies the electrical energy from a battery?",["Stored chemical energy","Stored radio-frequency radiation","The resistance of its outer case","The surrounding air alone"],"A battery converts stored chemical energy into electrical energy. A rechargeable cell uses a reversible chemical process when charged correctly."],
  ],
  "Circuits": [
    ["2A2","The switch in a simple battery-and-lamp circuit opens. What happens in the ideal circuit?",["Current stops because the conducting path is broken","Current doubles because resistance has disappeared","The battery instantly loses all terminal voltage","The lamp current reverses continuously"],"An open switch interrupts the complete current path. The battery can still have a voltage while no current is being drawn."],
    ["2A2","Two components are in the same unbranched series path. How do their currents compare?",["They are the same","The first always takes all the current","They divide in proportion to physical size","The second always carries twice the current"],"The same charge flow passes every point in a single series path. Current divides only where there are branches."],
  ],
  "Direct_vs_Alternating_Current": [
    ["2E1","Which statement distinguishes alternating current from steady direct current?",["AC reverses direction periodically","AC always flows in one direction","AC must have a larger current than DC","AC is the normal output of a single cell"],"Alternating current changes direction. Current magnitude alone does not determine whether it is AC or DC."],
    ["2E2","What is the nominal frequency of the UK mains electricity supply?",["50 Hz","25 Hz","100 Hz","500 Hz"],"UK mains frequency is nominally 50 Hz, meaning 50 complete cycles per second."],
  ],
  "Resistance": [
    ["2C1","What property opposes electric current in a resistor?",["Resistance","Frequency","Wavelength","Polarisation"],"Resistance opposes current and is measured in ohms. It is distinct from the voltage that drives current."],
    ["2C1","At a constant supply voltage, a resistor is replaced by one with twice the resistance. What happens to current?",["It halves","It doubles","It remains unchanged","It becomes four times greater"],"Ohm’s law gives I = V/R. Holding V constant while doubling R halves I."],
  ],
  "Formula_Resistance": [
    ["2C1","What current flows through the resistor in this ideal circuit?",["1.5 A","0.67 A","6 A","24 A"],"I = V/R = 6/4 = 1.5 A. Multiplying V by R would not give current.",{"type":"circuit","voltage":6,"resistance":4}],
    ["2C1","A 3 A current flows through a resistor with 9 V across it. What is the resistance?",["3 Ω","0.33 Ω","12 Ω","27 Ω"],"Rearrange V = IR to R = V/I. Therefore R = 9/3 = 3 Ω."],
    ["2C1","A 5 Ω resistor carries 2 A. What is the potential difference across it?",["10 V","2.5 V","7 V","0.4 V"],"V = I × R = 2 × 5 = 10 V. This tests finding a different unknown using the same relationship."],
  ],
  "Formula_Power": [
    ["2B1","A device draws 1.5 A from a 12 V supply. What power is transferred?",["18 W","8 W","13.5 W","0.125 W"],"P = V × I = 12 × 1.5 = 18 W. A watt describes energy transferred each second."],
    ["2B1","A 24 W load is supplied at 8 V. What current does it draw?",["3 A","16 A","32 A","192 A"],"Rearrange P = VI to I = P/V: 24/8 = 3 A."],
  ],
  "Series_and_Parallel_Circuits": [
    ["2A2","Two lamps are in series. One develops an open circuit. What happens to the other lamp?",["It goes out because the shared path is broken","It stays at its previous brightness","It receives an independent path from the supply","It changes from DC to AC operation"],"Both lamps share one series path. An opening anywhere in that path stops the current through both."],
    ["2A2","Two loads are connected in parallel across an ideal 6 V source. What is the voltage across each load?",["6 V","3 V","12 V","It depends only on which load is first"],"Each parallel branch is connected across the same two supply terminals, so each has the full 6 V across it."],
  ],
  "Digital_Signals": [
    ["2F1","Which description best fits a sampled digital representation of an analogue signal?",["Values recorded at discrete sampling instants","A continuously varying value with no sampling instants","A signal that cannot be processed by software","A signal whose propagation speed is necessarily higher"],"Sampling records values at particular instants. Digital processing does not make electromagnetic waves travel faster."],
    ["2F2","Which device converts an analogue input into a digital representation?",["ADC","DAC","SWR meter","Balun"],"An analogue-to-digital converter samples the input. A DAC performs the conversion in the other direction."],
  ],
  "Frequency": [
    ["2E2","A signal completes 2,000 cycles in one second. What is its frequency?",["2 kHz","2 MHz","200 Hz","0.002 Hz"],"Frequency counts complete cycles per second. 2,000 Hz is 2 kHz."],
    ["2E2","Which frequency is in the VHF range?",["145 MHz","7 MHz","433 MHz","2.4 GHz"],"VHF spans 30–300 MHz. 7 MHz is HF, while 433 MHz and 2.4 GHz are UHF."],
  ],
  "Wavelength": [
    ["2E7","A wave has a wavelength of 5 m. Approximately what is its frequency?",["60 MHz","5 MHz","150 MHz","1,500 MHz"],"Using f in MHz = 300/λ in metres gives 300/5 = 60 MHz. EX307 includes a frequency/wavelength conversion chart."],
    ["2E7","Which distance on a spatial wave drawing is one complete wavelength?",["The distance between adjacent peaks","The height from the centre line to a peak","The total length of any drawing window","The distance between a peak and its next trough"],"A wavelength is one full spatial cycle, such as peak to the next peak. Peak-to-trough is half a wavelength; height describes amplitude."],
  ],
  "Radio_Signals": [
    ["3C1","Which stage establishes the carrier frequency in a simple transmitter?",["Oscillator","Microphone amplifier","RF power amplifier","Loudspeaker"],"The oscillator generates the carrier frequency. Power amplification increases signal power rather than selecting the intended frequency."],
    ["3F1","What is the main purpose of a transmitter’s RF power amplifier?",["Raise the modulated signal to the required output power","Generate the carrier frequency","Put the message onto the carrier","Select the wanted received signal"],"The RF power amplifier raises the signal power. It is a different stage from carrier generation and modulation."],
  ],
  "Amplitude_Modulation_and_Frequency_Modulation": [
    ["3A4","Which modulation is represented by the waveform?",["AM","FM","Unmodulated CW carrier","Steady DC"],"The height of the carrier changes with the message while the carrier cycle spacing stays substantially constant: this is AM.",{"type":"waveform","mode":"am"}],
    ["3A4","Which modulation is represented by this constant-height waveform?",["FM","AM","Steady DC","An unmodulated carrier"],"The instantaneous cycle spacing changes while amplitude stays constant. Changing carrier frequency with the message is FM.",{"type":"waveform","mode":"fm"}],
  ],
  "FM_vs._AM": [
    ["3A2","In ideal FM, which quantity varies with the information being sent?",["Instantaneous carrier frequency","The speed of light","Battery chemical composition","Carrier amplitude only"],"FM varies instantaneous carrier frequency about its carrier value. Ideal FM amplitude remains constant."],
    ["3A2","Two radios use the same carrier frequency but different modulation modes. What else must agree for normal recovery of the message?",["The receiving demodulation mode","Both radios’ loudspeaker volume settings","Both transmitters’ RF output powers","Both transmitters’ microphone-gain settings"],"Correct tuning alone is insufficient. The receiver needs the demodulation method appropriate to how information was put on the carrier."],
  ],
  "CW_and_Data_Modes": [
    ["3A4","Which operation produces a basic Morse CW transmission?",["Keying a carrier on and off in an agreed pattern","Keeping the carrier continuously present without keying","Varying carrier frequency to follow a voice waveform","Varying carrier amplitude continuously to follow a voice waveform"],"Morse characters are represented by timed carrier on/off changes. The keying pattern conveys information without spoken words."],
    ["3A2","How can a computer audio interface be used to send a data mode?",["Its tones can modulate the radio-frequency carrier","Its tones replace the RF carrier so no RF modulation is needed","Its audio frequency must equal the transmitter’s RF frequency","Its screen provides the RF power normally supplied by the transmitter"],"Suitable audio tones generated by an interface can modulate the carrier. The equipment and level settings must be appropriate."],
  ],
  "Sidebands": [
    ["3A3","Which parts are present in a conventional AM signal?",["A carrier and two sidebands","Only an upper sideband","Only an unmodulated carrier","Two carriers with no sidebands"],"Conventional AM has a carrier with upper and lower sidebands. Modulation generates the sideband components."],
    ["3A3","What is normally transmitted in an SSB signal?",["One sideband, with the carrier suppressed","Both sidebands and the full carrier","Only the unmodulated carrier","A carrier with no information-bearing components"],"SSB retains one sideband. The carrier and the other sideband are suppressed in the usual SSB transmission."],
  ],
  "Transmitter_Basics": [
    ["3B1","What function belongs in transmitter block X?",["Modulator","Loudspeaker","Antenna matching unit","Detector"],"The message input joins the generated carrier in the modulator, before RF power amplification.",{"type":"transmitter"}],
    ["3E1","What is the job of a transmitter’s microphone amplifier?",["Raise and suitably limit the microphone signal for modulation","Generate the final radio-frequency carrier","Transform antenna impedance into audio power","Recover sound from the received carrier"],"The microphone amplifier prepares the audio signal for the modulator. Correct gain and suitable audio bandwidth are important."],
  ],
  "Transmitting": [
    ["3F3","Why should a transmitter output have a correctly matched load connected?",["A poor load can impair operation or damage the output stage","Matching creates additional electrical energy","Any unmatched load forces the transmitter off frequency","Matching makes the station exempt from power limits"],"The RF output stage is designed to work into an appropriate load. An antenna mismatch is not extra permission or free power."],
    ["3G1","Excessive FM deviation is most likely to cause which problem?",["Interference to adjacent channels","A lower wavelength at every instant","Automatic correction of antenna mismatch","A guarantee of better intelligibility"],"Excessive deviation makes the transmitted signal occupy too much spectrum and can affect adjacent channels."],
  ],
  "Receiver_Basics": [
    ["3H1","What is the receiver process that recovers information from a modulated RF signal?",["Demodulation","Battery charging","Impedance transformation","Carrier generation"],"Demodulation or detection recovers the information carried by a received signal."],
    ["3H2","Which sequence gives the normal order of these receiver functions?",["Antenna → selection/RF amplification → demodulation → audio amplification","Antenna → audio amplification → modulation → oscillator","Audio amplifier → antenna → RF amplifier → modulator","Modulator → loudspeaker → antenna → detector"],"The receiver first selects and processes the incoming RF, then recovers and amplifies its information for the output."],
  ],
  "Software_Defined_Radios": [
    ["3M1","After digitising its input, how does an SDR normally perform filtering and demodulation?",["Using software processing","Using only a passive antenna-matching unit","Using only a loudspeaker’s mechanical response","Using the ADC alone without subsequent signal processing"],"An SDR uses software to select and demodulate digitised signals. Suitable radio hardware and conversion are still necessary."],
    ["3M1","Which statement about an SDR transmitter is correct?",["Software is used to generate and process the transmitted signal","It requires no radio-frequency output hardware","It cannot use a conventional antenna","It cannot carry modulated information"],"Software performs signal generation or processing, but conversion and RF hardware are still needed to produce a transmitted radio signal."],
  ],
  "Station_Setup_and_Radio_Controls_Video": [
    ["3C1","Which setting most directly determines the carrier frequency of a simple transmitter?",["Frequency-generation or tuning setting","Loudspeaker volume","Display brightness","Headphone impedance"],"The frequency-generation stage sets carrier frequency. Incorrect tuning can put a transmission outside the permitted segment."],
    ["3G1","A voice transmission is distorted after microphone gain was increased too far. What is a suitable initial correction?",["Reduce and correctly set the microphone gain","Increase microphone gain further","Increase RF output power without correcting the audio drive","Increase receiver audio volume to compensate for the transmitted distortion"],"Excessive modulation can cause distortion and interference. Set microphone gain appropriately rather than increasing an already excessive level."],
  ],
  "Feeders": [
    ["4A1","Why is coaxial cable commonly used for an RF feeder?",["Its outer conductor provides screening","It eliminates all feeder loss","It is always a balanced feeder","It makes every antenna resonant"],"Coax has a centre conductor surrounded by a conducting screen. It is unbalanced and still has losses."],
    ["4A2","For the same cable type and frequency, what is a normal effect of using a longer feeder?",["More loss on both transmit and receive","More transmit gain with no receive change","Lower loss at every frequency","Automatic removal of antenna mismatch"],"Feeder loss converts some signal energy to heat. A longer run generally increases that loss in either direction."],
  ],
  "Connectors": [
    ["4G1","Why must the screen of a coaxial cable be correctly connected at its connector?",["To maintain screening and minimise unwanted RF entering or leaving","To convert the coax into a balanced twin feeder","To ensure its loss is always zero","To set the transmitter’s modulation mode"],"Correct connector type and proper screen termination help maintain the feeder’s electrical and screening performance."],
    ["4G1","Which list contains RF connector families used in amateur stations?",["BNC, N, SMA and PL259","HDMI, RJ45, USB and DisplayPort","XLR, DIN MIDI, TRS and RCA only","SATA, PCIe, M.2 and DIMM"],"BNC, N, SMA and PL259 are RF connector types. Correct identification and appropriate installation matter."],
  ],
  "Antennas": [
    ["4C1","What is the reciprocal role of a radio antenna?",["Convert electrical RF signals to radio waves and received waves to electrical signals","Only increase transmitter power drawn from the supply","Only remove unwanted audio frequencies","Assign a new frequency allocation to the station"],"An antenna couples electrical RF signals and electromagnetic waves. It is useful on receive as well as transmit."],
    ["4D1","Why are full-size antennas for 7 MHz usually much larger than those for 145 MHz?",["The lower frequency has a much longer wavelength","Lower-frequency waves travel much more slowly through air","Antenna size depends only on transmitter power","Lower-frequency radios necessarily require more antenna gain"],"Many full-size antennas use dimensions related to wavelength. Lower frequency means longer wavelength, without a corresponding reduction in wave speed."],
  ],
  "Antenna_type_Dipole": [
    ["4D1","Approximately how long is an ideal half-wave dipole for 30 MHz?",["5 m overall","2.5 m overall","10 m overall","30 m overall"],"The wavelength is 300/30 = 10 m. Half of that is 5 m overall; actual construction dimensions require adjustment."],
    ["4C2","For a horizontal half-wave dipole, maximum response is normally in which direction?",["Broadside to the wire","Along either end of the wire","Only directly above the feed cable","Equally strong in every horizontal direction"],"A horizontal dipole’s pattern has broadside maxima and minima along the wire. Orientation therefore matters."],
  ],
  "Antenna_type_14_Wave_Ground_Plane": [
    ["4D1","An ideal quarter-wave vertical operates at a wavelength of 2 m. What is the vertical element length?",["0.5 m","1 m","2 m","8 m"],"One quarter of 2 m is 0.5 m. The conducting ground-plane arrangement is another part of the antenna system."],
    ["4D1","Which arrangement describes a quarter-wave ground-plane antenna?",["A vertical radiating element with a conducting ground-plane or radial arrangement","Two equal horizontal half-wave arms in series","Several parallel elements on a Yagi boom","Only a loop of audio cable with no RF feed"],"A ground-plane antenna includes the vertical element and an appropriate conducting return structure, often radials."],
  ],
  "Antenna_type_58_Wave_Ground_Plane": [
    ["4D1","For the same wavelength, how does a five-eighths-wave element compare with a quarter-wave element?",["It is 2.5 times as long","It is half as long","It is the same length","It is four times as long"],"Five eighths divided by one quarter is (5/8)/(2/8) = 2.5. Real feed arrangements must suit the antenna design."],
    ["4D1","A five-eighths-wave element is intended for a wavelength of 4 m. What is its ideal length?",["2.5 m","0.625 m","1 m","6.4 m"],"The ideal length is 4 × 5/8 = 2.5 m. It is a wavelength fraction, not five eighths of the frequency."],
  ],
  "Antenna_type_End-Fed": [
    ["4D1","Which feature identifies an end-fed wire antenna?",["The feeder joins at an end of the radiating wire","The feeder always joins at its midpoint","It always has several parasitic elements on a boom","It must have the same feed impedance on every band"],"End-fed describes the location of the feed connection. Suitable matching and an RF return arrangement are still required."],
    ["4C6","Moving the feed connection from the centre to the end of a wire may particularly change what?",["The feed-point impedance and matching requirement","The carrier frequency automatically generated by the transmitter","The modulation mode automatically recovered by the receiver","The characteristic impedance specified for the unchanged feeder"],"The feed-point impedance depends on the antenna design, dimensions, frequency and feed position. A connector that fits does not prove an electrical match."],
  ],
  "Antenna_type_Yagi": [
    ["4C2","The illustrated Yagi pattern has its main lobe towards the right. Which station direction is most favoured?",["To the right of the antenna","To the left of the antenna","Equally in all four directions","Only vertically downwards"],"The main lobe shows the direction of greatest response in the illustrated plane. It is not a map of guaranteed coverage.",{"type":"pattern","pattern":"yagi"}],
    ["4C3","How does a passive Yagi obtain gain in its favoured direction?",["By concentrating radiation into a directional pattern","By generating extra electrical energy","By increasing the transmitter’s permitted power limit","By eliminating the need for a feeder"],"Antenna gain redistributes radiation. It does not create energy or increase the licence power allowance."],
  ],
  "Polar_Patterns": [
    ["4C2","In the horizontal dipole pattern shown, which directions have the greatest response?",["Up and down on the drawing","Left and right on the drawing","All directions equally","Only into the page"],"The drawn broadside lobes have the greatest response. The minima lie along the horizontal dipole wire.",{"type":"pattern","pattern":"dipole"}],
    ["4C2","What information does an antenna polar pattern primarily show?",["Relative response in different directions","The safe voltage of its feeder insulation","Its exact local coverage in kilometres","The maximum legal power on every band"],"A polar pattern describes directionality in a specified plane. Terrain, propagation and many other factors are needed to predict a real link."],
  ],
  "Antenna_Gain_and_ERP": [
    ["4C3","An antenna receives 6 W and has a power gain factor of 4 relative to a dipole. What is the ERP?",["24 W","10 W","1.5 W","6 W"],"ERP is the power at the antenna multiplied by its gain factor relative to a dipole: 6 × 4 = 24 W."],
    ["4C3","An antenna’s gain increases while the power fed to it stays constant. What explains a higher ERP?",["Greater concentration of radiation in the favoured direction","Extra energy created inside the antenna","A necessary increase in supply voltage","A change from watts to volts"],"Higher directional gain can increase ERP without increasing the total power supplied to a passive antenna."],
  ],
  "Polarisation": [
    ["4C1","A straight antenna is mounted vertically. What polarisation does it normally produce?",["Vertical","Horizontal","Alternating between AM and FM","Determined only by transmitter power"],"For a straight antenna, the orientation sets the normal linear polarisation. This is separate from modulation mode."],
    ["4C5","For a direct VHF link between two linearly polarised antennas, which arrangement normally reduces polarisation mismatch?",["Both have the same polarisation","One antenna is vertical and the other horizontal","Increasing RF power while retaining crossed polarisations","Changing modulation mode while leaving the polarisations different"],"Matching the antenna polarisations improves direct-path coupling. Real reflections can alter the observed result."],
  ],
  "Baluns": [
    ["4B1","What does the name balun describe?",["A balanced-to-unbalanced transition","A battery-to-mains converter","A device that assigns band-plan segments","A receiver audio-volume control"],"A balun joins balanced and unbalanced arrangements. Its particular design determines its other electrical properties."],
    ["4B1","Which connection is a typical use for a suitable balun?",["A balanced dipole fed by unbalanced coax","A DC battery connected to a resistive lamp","An audio amplifier connected to headphones","A microphone connected to an audio amplifier"],"A dipole is a balanced arrangement and coax is unbalanced. A suitable balun addresses that transition."],
  ],
  "Feed_Point_and_Impedance": [
    ["4C6","What is the feed point of an antenna?",["The point where the feeder connects to the antenna","The highest point of its support mast","The centre frequency of the transmitted message","The position of the mains fuse"],"The feed point is the electrical connection between feeder and antenna, whose impedance is relevant to matching."],
    ["4C6","An antenna feed-point impedance differs substantially from the feeder impedance. What may happen?",["Some forward RF power is reflected back along the feeder","All reflected power is converted into new messages","The feeder automatically becomes lossless","The wave speed in air doubles"],"An impedance mismatch causes reflection. The reflected fraction depends on the degree of mismatch, not just whether the connector fits."],
  ],
  "Antenna_Matching_and_SWR": [
    ["4E2","A transmitter-side SWR reading is high. Which part of the installation should be investigated first?",["The antenna and feeder system","The receiver’s audio amplifier","The transmitter’s microphone gain","The receiver’s AGC setting"],"High SWR indicates a load mismatch in the antenna/feeder system; it is not, by itself, proof of a faulty transmitter."],
    ["4F1","What can an antenna matching unit do?",["Transform the impedance presented to the transmitter","Make every antenna radiate all input power efficiently","Remove all feeder losses","Grant permission for additional frequency bands"],"An AMU can correct the impedance seen by the transmitter. It does not eliminate every antenna or feeder loss."],
  ],
  "Radio_Waves": [
    ["5A1","A radio wave spreads over a larger area as it travels. What normally happens to its strength?",["It decreases","It increases","It must remain constant","It becomes independent of distance"],"Spreading distributes the transmitted energy over a larger region, so signal strength normally decreases with distance."],
    ["5A1","Which pair of effects can change a radio wave’s direction?",["Reflection and refraction","Modulation and demodulation","Rectification and amplification","Sampling and quantisation"],"Reflection redirects a wave at an interface; refraction changes its direction as propagation conditions vary. Both can affect radio paths."],
  ],
  "The_Ionosphere": [
    ["5B1","What primarily causes ionisation in the Earth’s ionosphere?",["Ultraviolet radiation from the Sun","Heating by the Earth’s interior","The Moon’s gravitational pull on the atmosphere","Radio energy supplied by local amateur transmitters"],"Solar ultraviolet radiation ionises atmospheric gases. This helps explain why ionospheric conditions vary with solar illumination and activity."],
    ["5B1","Where are the ionospheric layers relevant to the Foundation syllabus approximately located?",["70–400 km above the Earth","About 7–40 km above the Earth","About 700–4,000 km above the Earth","About 0.7–4 km above the Earth"],"The current Foundation syllabus describes ionised layers at roughly 70–400 km altitude, far above the local terrain and ordinary antenna heights."],
  ],
  "HF_Bands": [
    ["5B2","A distant HF contact works at one time of day but not another, with unchanged equipment. What is a plausible explanation?",["The ionospheric path has changed","HF waves require an unobstructed visual path at every time of day","The frequency-to-wavelength relationship reverses at night","Radio-wave speed in air changes greatly between day and night"],"HF skywave paths depend on frequency, time of day, season and solar activity. The same station can therefore experience different propagation."],
    ["5B2","An HF band is described as open to a distant region. What does that mean?",["Conditions support a useful skywave path to that region","Every frequency in it is legally unrestricted","No station is currently transmitting anywhere in it","Its antennas no longer require a feeder"],"Open describes propagation conditions, not licence permission or whether the band is occupied."],
  ],
  "VHF_and_UHF": [
    ["5C1","Two handheld users lose their direct path when a hill is between them. What is the likely propagation effect?",["A radio shadow","A guaranteed ionospheric reflection on that same path","An automatic increase in effective radiated power","A change in the assigned transmitter frequency"],"Hills obstruct direct VHF/UHF paths and can produce radio shadows. Suitable changes of location or antenna height may improve the path."],
    ["5C1","Which effect can extend VHF/UHF range beyond the usual direct-path expectation?",["Atmospheric ducting","Increasing only the receiving loudspeaker volume","Increasing only microphone gain","Changing the station’s transmit identification"],"Atmospheric ducting can guide signals over longer paths. It is a propagation effect, unlike the local audio controls."],
    ["5C3","Why can increasing antenna height be more useful than increasing transmit power alone?",["A better path can improve both transmitting and receiving","Height automatically raises the permitted power limit","Height removes all feeder loss","It changes VHF into HF"],"A clearer or higher antenna position can improve both directions of a radio link. More transmitter power alone does not improve your reception."],
  ],
  "Ofcom": [
    ["1D1","An authorised inspector requires a station’s operation to be restricted because of interference. Which organisation has this regulatory role?",["Ofcom","The RSGB contest committee","The equipment retailer","The local amateur radio club"],"Ofcom is the regulator. An authorised person can exercise the inspection, modification, restriction and closedown powers specified by the licence."],
    ["1D2","An authorised person from Ofcom requires a transmission log for a specified period. What should the licensee do?",["Keep the required log for that period","Refuse because routine logging is normally optional","Record only transmissions that receive a reply","Keep only the normal voluntary contact log even if the requirement differs"],"An explicit Ofcom requirement to keep a log is distinct from ordinary voluntary operating practice and must be complied with."],
  ],
  "Amateur_Radio_Licence": [
    ["1A3","How often must the details recorded on an amateur licence be validated at a minimum?",["At least once every five years","Only when the first radio is purchased","At least once every twenty years","Only after an interference complaint"],"The licence requires validation at least every five years. Changes to name or address must also be notified when they occur."],
    ["1A4","During a contact you move to a new frequency. Which identification action is required for the exam syllabus?",["Identify the station on the new frequency","Identify only if another station asks","Continue using the identification given on the previous frequency","Identify only after the first hour of operation"],"The syllabus includes identification when changing frequency or mode. The station must remain clearly identifiable."],
  ],
  "Rules_and_Restrictions": [
    ["1C1","Which is a permitted reason to make an initial transmission that may be heard by any amateur listening?",["A CQ call seeking an amateur contact","A paid advertisement to the general public","A regular public music programme","A commercial traffic dispatch broadcast"],"An initial CQ call is an exception to the general-reception restriction. It seeks a contact rather than providing a general broadcast service."],
    ["1C2","Why is ordinary Morse not prohibited as a secret code?",["Its agreed code does not conceal the meaning of the message","It always uses less than one watt","It can be received only in the same country","It is exempt from every identification requirement"],"Morse is a publicly understood encoding. The restriction concerns secrecy that obscures a message’s meaning, subject to the specified exceptions."],
  ],
  "UK_Callsigns": [
    ["1A2","A Foundation station uses the regional locator W appropriately. Which UK region does it indicate?",["Wales","Scotland","Northern Ireland","The Isle of Man"],"W denotes Wales. Regional locators, when used, must be appropriate to the location."],
    ["1A2","Which statement about regional locators is correct for the syllabus?",["They are optional for an M7 call sign but mandatory in the 2x series","They are forbidden in all Foundation call signs","They may indicate any region the operator prefers","They replace the rest of the assigned call sign"],"The syllabus distinguishes optional regional locators from the mandatory locator in 2x-series call signs. Correct identification remains necessary."],
  ],
  "Supervision_Clause": [
    ["1B1","An unlicensed visitor operates under a licensee’s direct supervision. Which identification and limits apply?",["The supervisor’s call sign and licence conditions","The visitor’s name and the radio’s maximum capability","The privileges of the highest licence held by anyone in the club","The supervisor’s identity with no frequency or power restrictions"],"Supervised use takes place under the supervisor’s call sign and licence. The supervisor remains responsible for compliance."],
    ["1B1","Why must the supervising licensee remain physically present for directly supervised use?",["To be able to take back control of the equipment","To make the antenna gain larger","To change the visitor’s qualification automatically","To remove the need to observe frequency limits"],"Ofcom guidance describes direct physical supervision so the licensee can regain control. Being reachable by a remote message is different."],
  ],
  "User_Services_Clause": [
    ["1B1","Which statement describes the licence’s User Service provision at Foundation syllabus level?",["In specified circumstances a licensee may allow User Service use of the equipment","Any customer may rent the station for business messages","A User Service may replace all frequency and power limits","All ordinary club contacts automatically use this provision"],"The licence makes a specific provision; it is not a blanket commercial or unrestricted operating permission. The identity of the service is not examined at this level."],
    ["1C2","Which situation is a specified exception to the usual restriction on encrypted amateur messages?",["Encryption at the direct request of a User Service","Any private conversation between two friends","Any transmission below the maximum power limit","Any signal sent from a portable station"],"The syllabus includes User Service requests and amateur-satellite control among the specified exceptions. Ordinary privacy preference is not an exception."],
  ],
  "Frequency_Schedule_Parameters_Table": [
    ["1H1","Use EX307. A Foundation station is within 100 km of Charing Cross. What does the schedule say about 431–432 MHz?",["That range is unavailable there","It is available there at up to 25 W ERP","It is available there if power is reduced to 10 W","It is available there only for simplex FM"],"The schedule has a geographical restriction on this range. Its footnote matters as well as its secondary status and power column.",null,true],
    ["1H1","Use EX307. Which power definition is specified for the 430–431 MHz Foundation allocation?",["ERP","Audio power at the microphone","Battery input power","Loudspeaker output power"],"EX307 specifies ERP for this part of the allocation. Read the power definition, not just the numerical watt value.",null,true],
  ],
  "Band_Plans": [
    ["7B1","What is the main reason for following an amateur band plan?",["To share the band sensibly between modes and activities","To replace the licence with a voluntary document","To make every part of the band suitable for every mode","To ensure all stations use maximum power"],"Band plans coordinate activities within a band. Licence conditions and allocation restrictions still apply."],
    ["1H1","An amateur allocation has secondary status. What is a key consequence?",["Primary services must be protected from interference","Amateurs have exclusive use of every channel","No licence is needed if the channel is quiet","The maximum permitted power is always the same as on a primary band"],"Secondary users operate subject to protections for primary services. Status and power are separate pieces of schedule information."],
  ],
  "EMF_Compliance": [
    ["1G1","An unlicensed family member visits the transmitting station. What does the family relationship mean for public-exposure protection?",["It provides no automatic exemption from the relevant limits","It automatically exempts the visitor from protection","Protection applies only when they leave the property","Their verbal consent removes the licence condition"],"An unlicensed family member is not exempt merely because of their relationship to the operator. Consider their access and exposure under the applicable public-exposure requirements."],
    ["1G1","An EMF assessment concludes that no further action is required. What should be retained?",["A record including the justification for that conclusion","Only a note of transmitter output power, with no assessment reasoning","No assessment record because no further action is required","Only the most recent station-contact log entry"],"The syllabus requires an assessment record, including the reason no further action is necessary where that is the conclusion."],
  ],
  "What_is_EMC": [
    ["6A1","Two electronic devices can work together without unacceptable interference. What concept does this describe?",["Electromagnetic compatibility","Antenna standing wave ratio","Regional station identification","Peak envelope power"],"EMC concerns equipment coexisting without unacceptable interference. It is distinct from antenna matching and station identity."],
    ["6A2","A receiver continues working correctly in the presence of a strong unwanted RF field. What property is being demonstrated?",["Immunity","Modulation index","Antenna matching","Receiver audio gain"],"Immunity is the ability of equipment to function correctly despite an electromagnetic disturbance."],
  ],
  "Modes_and_EMC": [
    ["6B1","Which group is generally most likely to cause the amplitude-related interference problems recalled in the syllabus?",["AM and SSB","FM voice and FM data","Steady unmodulated DC supplies","Every mode equally in every installation"],"The syllabus identifies AM and SSB as more likely to cause these problems. Varying amplitude can be unintentionally detected in susceptible equipment; actual EMC depends on the installation."],
    ["6B1","Keeping the installation otherwise unchanged, what effect can increasing transmit power have on EMC risk?",["It can make interference more likely","It guarantees improved immunity of nearby devices","It removes all unwanted coupling paths","It makes the modulation mode irrelevant"],"A stronger transmitted field can increase unwanted pickup. Reducing power may be a useful controlled test, although it is not a complete diagnosis."],
  ],
  "Dealing_with_Interference": [
    ["6C1","Which connection can act as a route for RF interference into an affected device?",["Its power or signal leads","Only a direct connection to the transmitter antenna socket","Only the received audio programme itself","Only a wire intentionally designed as an antenna"],"Unwanted RF may couple through power, antenna, speaker or other leads, as well as into internal circuits."],
    ["6D4","What is a dummy load used for in transmitter testing?",["Provide a suitable non-radiating load in place of the antenna","Supply a calibrated RF test signal to the receiver","Increase transmitter output power before the antenna","Correct every antenna mismatch without disconnecting the antenna"],"A correctly rated dummy load allows transmission tests with greatly reduced radiation. Tests can help distinguish radiated coupling from other routes; they are not proof that all interference is absent."],
  ],
  "Avoiding_Interference": [
    ["6D1","Where should a suitable external interference filter normally be fitted on an affected device’s lead?",["As close to the affected device as practicable","At the far end of the same lead regardless of the remaining cable length","Only at the transmitter output, whatever the actual entry route","At any convenient point, because position can never affect pickup"],"A filter or choke close to the affected equipment reduces the length of lead beyond the filter that can collect unwanted RF."],
    ["6E1","Which station arrangement can help reduce EMC problems?",["Site the antenna suitably high and away from affected equipment","Put the antenna as close as possible to vulnerable electronics","Remove the mains protective earth","Increase microphone gain until distortion appears"],"Appropriate antenna position and installation can reduce coupling. Electrical safety must be retained while making EMC improvements."],
  ],
  "EMC_and_Neighbours": [
    ["6G2","A neighbour reports intermittent interference. Which pair of records is especially useful?",["Your operating log and the neighbour’s disturbance log","Only the radio’s purchase receipt and warranty","Only each household’s postcode","Only a list of previous examination scores"],"Matching operating times and disturbance times helps identify a possible relationship and plan controlled tests."],
    ["6G2","Which approach best helps investigate a suspected interference problem?",["Agree controlled tests with the complainant and record the observations","Change several unrelated things without recording them","Assume every nearby disturbance is caused by the transmitter","Ignore all reports until the equipment stops working"],"Cooperative tests and clear observations give evidence. A timing correlation or a single improvement is a useful lead, not necessarily a complete diagnosis."],
  ],
  "EMC_and_Cars": [
    ["6F1","Who is responsible for ensuring a radio installation does not compromise the vehicle’s electrical systems and safety?",["The vehicle owner","Only the last station contacted","Only the repeater keeper","Only the Foundation examiner"],"The owner must ensure a compatible and safe installation, seek suitable professional advice and make the appropriate insurance disclosure."],
    ["6F3","Which vehicle systems can produce interference received by a mobile radio?",["Ignition and battery-charging systems","Only nearby amateur transmitters, never equipment in the vehicle","Only the vehicle radio’s demodulated audio output","Only external overhead electricity lines, never the charging system"],"Ignition and charging electronics can generate electrical interference. A vehicle installation can receive interference as well as cause it."],
  ],
  "EMC_Advice": [
    ["6G1","Which specialist amateur-radio resource is appropriate for help with a persistent EMC problem?",["The RSGB EMC Committee and its information leaflets","A repeater keeper solely because the symptom is on a radio","A contest adjudicator solely because the station has entered contests","A frequency-allocation table alone, without technical investigation"],"The RSGB provides EMC advice and leaflets; experienced local amateurs may also help with appropriate investigation."],
    ["6G2","What would be most useful to include when seeking interference advice?",["Times, affected equipment, operating details and results of controlled tests","Only the transmitter’s maximum advertised power","Only an assurance that the antenna has a low SWR","Only the distance between the two properties"],"Specific observations help an adviser compare mechanisms and suggest relevant tests. Unsupported assumptions do not identify the cause."],
  ],
  "Safety_Voltage_and_Current": [
    ["8A1","Which pairing correctly identifies electrical hazards?",["High voltage: electrocution; high current: overheating and fire","High voltage: fire only; high current: weak reception only","High voltage: harmless with any fuse; high current: harmless at low voltage","Voltage and current are unrelated to electrical injury or heating"],"Voltage can drive dangerous body current, while large fault currents can produce heating and fire. Low voltage does not remove every hazard."],
    ["8A7","Someone is in contact with equipment during an electrical accident. What is the first action?",["Switch off and isolate the power before touching the casualty","Pull the casualty away with bare hands while power remains on","Increase transmitter power to attract attention","Remove only the microphone and continue operating"],"First remove the electrical danger. Touching a casualty who is still connected to a live source can create a second casualty."],
  ],
  "Mains_and_RF_Earths": [
    ["8A2","An RF problem appears to improve when a mains protective earth is removed. What is the correct response?",["Restore the safety earth and obtain an appropriate safe solution","Leave the protective earth disconnected permanently","Disconnect it only while using an interfering mode","Use the station only at low RF power with the protective earth removed"],"A fitted mains safety earth must not be removed to solve an RF problem. RF arrangements and protective earthing serve different purposes."],
    ["8A2","Before modifying an installation involving PME earthing, what is required?",["Advice from a competent electrical professional","Only a satisfactory SWR measurement","Only permission from another amateur licensee","Only confirmation that the receiver noise is reduced"],"PME arrangements require particular care. A competent electrical professional must be consulted before modifications."],
  ],
  "Mains_Plugs_and_Fuses": [
    ["8A3","Which UK mains-plug conductor colours are correctly paired?",["Brown: live; blue: neutral; green/yellow: earth","Blue: live; brown: earth; green/yellow: neutral","Green/yellow: live; blue: earth; brown: neutral","Brown: neutral; blue: earth; green/yellow: live"],"The standard colours identify the conductor functions. This knowledge is not a reason to work on live equipment."],
    ["8A4","A mains fuse blows. Which action is appropriate?",["Investigate the cause and use the manufacturer-specified protection","Fit a much larger fuse to prevent further interruptions","Bridge the fuse with wire","Remove the protective earth to reduce current"],"A fuse opens under excessive current. Its failure must be investigated; bypassing or arbitrarily uprating it defeats protection."],
    ["8A5","What additional protection can an appropriate RCBO provide compared with a conventional fuse alone?",["Detection of small earth-leakage currents as well as overcurrent protection","A guarantee that touching live and neutral is safe","Permission to work inside live equipment","Removal of the need for protective earthing"],"An RCBO adds residual-current protection. It does not make live work or contact with live and neutral safe."],
  ],
  "Battery_Safety": [
    ["8A8","Why can a low-voltage battery be dangerous if its terminals are shorted by metal?",["A very large current can cause heating and fire","Its voltage must instantly become mains AC","Its frequency must become VHF","The short automatically provides safe current limiting"],"Some batteries supply very large fault currents. Protect exposed terminals and follow the specified protection and handling arrangements."],
    ["8A8","Which charger should be used for a rechargeable battery?",["A suitable charger specified for that battery chemistry and pack","Any charger whose connector happens to fit","A charger chosen only because its output current rating is large","A charger for a different chemistry without confirming compatibility"],"Battery chemistries need appropriate charging control. An unsuitable charger can cause damage, fire or explosion, particularly with lithium batteries."],
  ],
  "Shack_Safety": [
    ["8A7","What is a useful arrangement for isolating a home or club station in an emergency?",["A clearly marked main switch whose position is known to others","A hidden switch that only the operator can locate","Only the transmitter’s push-to-talk switch","Only the receiver’s audio-volume control"],"Emergency isolation must be easy to identify and use. Other people may need to act if the operator cannot."],
    ["8F2","Why should cables not trail across a walking route?",["They create trip hazards and can suffer insulation damage","They necessarily improve feeder matching","They reduce the need for main-switch access","They automatically make the supply safer"],"Trailing leads can trip people and become damaged through movement or wear. Cable routing is part of station safety."],
  ],
  "Working_at_Height": [
    ["8C2","Which height-to-base-distance ratio is the usual ladder-angle guide in the syllabus?",["4:1","1:1","1:4","10:1"],"The guide is four units up for one unit out. Suitable securing, access equipment and competent assistance are also needed."],
    ["8C1","Why is another person advisable during antenna erection?",["The task is hazardous and assistance may be needed","Their presence doubles the antenna gain","They remove the need to secure access equipment","They automatically authorise work near power lines"],"Antenna erection can involve falls, handling hazards and emergencies. Assistance supports safer work; it does not remove the other precautions."],
  ],
  "Antenna_Safety": [
    ["8F1","Why must antennas, feeders and ladders be kept well clear of overhead power lines?",["Contact or electrical arcing can cause a lethal shock","All overhead cables are amateur-radio feeders","The lines always improve antenna matching","The only concern is reduced receive sensitivity"],"A dangerous current can result from contact or arcing. Plan for movement or falling as well as the intended erected position."],
    ["8F1","What should be considered when selecting a site for a mast or wire?",["Where it could move or fall, and whether it remains clear of hazards","Only the clearance while it remains upright in calm weather","Only its distance from the radio, without considering a fall","Only whether the proposed arrangement gives a low SWR"],"Siting and securing the complete installation matter. A position that seems clear while upright may still be hazardous if something falls."],
  ],
  "RF_Safety": [
    ["8D1","What is the main health effect of excessive RF exposure recalled by the Foundation syllabus?",["Heating of body tissue","Ionisation of body tissue in the same way as X-rays","Mechanical vibration of the eardrum","A guarantee of immediate electric shock without contact"],"The principal effect examined is tissue heating. The eyes are particularly susceptible, and suitable exposure controls are necessary."],
    ["8D4","Why should transmitting antenna conductors normally be kept out of accidental reach?",["Contact can cause RF burns or injury","Touching them improves their impedance match","They carry only harmless audio signals","A hand is required to complete every transmitting circuit"],"RF-carrying conductors may present a contact hazard during transmission. Suitable siting prevents accidental contact."],
    ["8D3","Which action should be avoided around microwave transmitting equipment?",["Looking into a waveguide or standing close in front of a high-gain transmitting antenna","Reading the manufacturer’s safety instructions","Keeping people out of the assessed exclusion area","Checking that transmission has stopped before suitable work"],"High-gain microwave arrangements can concentrate RF energy. Avoid looking into a waveguide or entering the transmitting beam at close range."],
  ],
  "Car_Safety": [
    ["6F2","After installing mobile radio equipment, which tests should precede any on-road testing?",["Tests with the vehicle stationary and its systems operating","Only tests while driving at motorway speed","Only checks with every vehicle system switched off","Only a receiver-volume test with no transmission"],"The syllabus calls for stationary tests with vehicle systems operating before on-road tests. Installation must not compromise vehicle safety."],
    ["6F1","Which approach is appropriate for a mobile radio installation?",["Seek professional advice about compatibility and vehicle safety","Assume a working transmitter proves all vehicle systems are unaffected","Modify safety-critical electronics without advice","Omit the installation from any required insurance disclosure"],"A successful contact is not a compatibility or safety assessment. Obtain appropriate advice and make the required disclosures."],
  ],
  "Outdoor_Safety": [
    ["8F4","What extra electrical hazard can arise at a temporary outdoor station?",["Damp conditions combined with temporary mains connections","The existence of a written station log","The use of an appropriate band plan","The use of the correct phonetic alphabet"],"Outdoor and temporary premises can introduce moisture, cable-routing and temporary-supply hazards. Suitable protection and competent advice are important."],
    ["8E1","A particularly high antenna is being planned. Which additional issue may need specialist consideration?",["Lightning protection","Only the transmitter’s microphone bandwidth","Only the receiver’s audio-output impedance","Only the optional portable call-sign suffix"],"High antennas may need appropriate lightning protection. Obtain suitable advice rather than assuming a drawing or improvised wire provides it."],
  ],
  "Finally_on_Safety": [
    ["8F5","Who has a responsibility to notice and report an unsafe station condition?",["Everyone present, including operators and visitors","Only the person with the highest licence level","Only the last person to use the microphone","Only the equipment manufacturer"],"Safety is everyone’s responsibility. Warn others and report or address unsafe conditions appropriately."],
    ["8B1","Which item directly protects against flying metal swarf reaching the eyes when drilling?",["Suitable eye protection against flying swarf","General work gloves alone","Hearing protection alone","A dust mask alone"],"Metal particles can injure eyes. Use suitable eye protection and safe tool handling."],
    ["8B7","Why should a soldering work area have suitable ventilation?",["Flux fumes can cause breathing problems","Ventilation removes the need to support a hot iron safely","Ventilation replaces the need for eye protection","Ventilation prevents all electric-shock hazards"],"Flux fumes can irritate the respiratory system. Ventilation, eye protection and a proper iron stand address different hazards."],
  ],
  "Phonetic_Alphabet": [
    ["7A5","Which pair correctly spells the letters A and J in the standard phonetic alphabet?",["Alfa and Juliett","Alpha and Jupiter","Adam and Julietta","Able and Joker"],"The standard spelling words are Alfa and Juliett. Agreed words reduce ambiguity between individual letter names."],
    ["7A5","Which phonetic sequence represents the letters R, S and T?",["Romeo Sierra Tango","Robert Sugar Thomas","Roger Signal Tone","Radio Sierra Transmit"],"The agreed alphabet uses Romeo, Sierra and Tango, rather than locally invented alternatives."],
  ],
  "Signal_Reports_and_Q_Codes": [
    ["7E2","In an RS report of 47, what does the first digit describe?",["Readability","Signal strength","Tone quality","Antenna gain"],"RS is readability followed by strength. Readability uses a 1–5 scale, so 4 is a readability judgment, not a strength measurement."],
    ["7E2","What is the order of the three parts of an RST report?",["Readability, strength, tone","Resistance, strength, time","Readability, speed, temperature","Range, signal, tuning"],"RST is readability, strength and tone, with maximum scale values of 5, 9 and 9. Tone is particularly relevant to Morse signals."],
  ],
  "Callsign_Suffixes": [
    ["7A4","Which optional suffix commonly indicates portable operation?",["/P","/M","/MM","/A"],"/P indicates portable operation. A suffix describes the situation; it does not replace the assigned call sign or licence conditions."],
    ["7A4","Which optional suffix describes maritime mobile operation?",["/MM","/P","/A","/M only"],"/MM is maritime mobile. Whether an operation is authorised still depends on the applicable licence and location conditions."],
  ],
  "Spectrum_Users_and_Band_Plans": [
    ["7B2","Use the frequency-allocation information in EX307. What service occupies 87.5–108 MHz?",["Broadcasting","Amateur satellite only","Maritime mobile only","Radio astronomy only"],"The reference allocation table identifies the VHF broadcast band. A receiver being able to tune it is not amateur transmitting permission.",null,true],
    ["7B1","Use the specimen 2 m band plan in EX307. Which frequency is the FM calling frequency?",["145.500 MHz","144.300 MHz","144.050 MHz","145.000 MHz"],"Read the FM calling entry in the exam booklet. 144.300 MHz is an SSB centre of activity, not the FM calling frequency.",null,true],
  ],
  "Making_a_Contact": [
    ["7A1","Before calling on a frequency that appears suitable, what should you first do?",["Listen and check whether it is already in use","Immediately transmit a long CQ at maximum power","Assume a quiet signal meter proves it is unused","Give only another station’s call sign"],"Listening and checking help avoid disrupting an existing contact. A quiet moment or weak meter reading does not establish that the channel is free."],
    ["7A3","Two stations establish contact on a VHF calling channel. What should they normally arrange next?",["Move to a suitable clear working frequency","Keep the calling channel occupied for the whole contact","Change to a beacon frequency","Stop identifying because contact is established"],"Calling channels help stations find contacts. Moving to a clear working frequency leaves the calling channel available for others."],
  ],
  "Using_Repeaters": [
    ["7C1","Why does a normal voice repeater use different input and output frequencies?",["It receives on one frequency and retransmits on another","To make the radio waves propagate at different speeds","To change all received modes into a different modulation mode","To select different antenna polarisations automatically"],"The transmit/receive offset supports the repeater’s receive-and-retransmit operation. A handheld must use the correct input/output arrangement."],
    ["7C1","What is the purpose of a repeater’s specified CTCSS access tone?",["To provide the required access signal for that repeater","To set the transmitter-to-receiver frequency offset","To adjust RF output power automatically","To correct excessive FM deviation automatically"],"CTCSS provides an access condition. Correct tone alone does not provide a usable radio path or correct frequency offset."],
  ],
  "Digital_Voice": [
    ["7F1","Two digital voice radios are on the same frequency but use incompatible systems. What is likely?",["They may not recover intelligible communication from one another","The frequency setting alone guarantees intelligibility","Both radios automatically select a common codec","Matching CTCSS alone makes every digital system compatible"],"Digital voice needs compatible radio-system settings and encoding, not merely the same tuned frequency."],
    ["7F1","You borrow a DV radio that embeds its owner’s call sign. What should be checked before your own operation?",["That the embedded identification is appropriate for your operation","Only that the RF power is the same as the owner’s usual setting","Only that the receiver volume matches your preferred level","That the previous owner’s identity is retained for every operator"],"Some DV systems embed identification in their transmitted data. A borrowed radio may need its identification settings adjusted."],
  ],
  "Sending_and_Receiving_Data": [
    ["7D1","A computer interface is connected to a transmitter’s microphone socket. What must be checked?",["Correct PTT operation and suitable signal levels","Only whether the plug fits the socket","Only the receiver’s loudspeaker volume","Only that the computer and radio use the same supply voltage"],"An interface can affect transmit control and audio drive. A fitting plug does not prove appropriate levels or PTT operation."],
    ["3A2","Which statement about sending data through a radio audio interface is correct?",["Suitable data tones can carry information by modulating the RF carrier","The audio cable alone transmits the radio signal worldwide","Data operation removes the need for a modulation process","All digital modes use identical timing and encoding"],"The interface supplies an information-bearing signal for modulation. Appropriate encoding, mode and interface settings are still required."],
  ],
  "Satellites_and_ISS": [
    ["7G1","Where should amateur-satellite operation take place?",["In the amateur-satellite allocations and appropriate sub-bands","On any quiet broadcast frequency","On every amateur frequency without distinction","Only on a repeater’s terrestrial input channel"],"Satellite operation uses the allocations and sub-bands designated for that service, with the applicable licence conditions."],
    ["7G1","Why should ordinary terrestrial contacts avoid designated satellite frequencies?",["To avoid interfering with satellite operation","Those frequencies necessarily use slower radio waves","Those frequencies cannot carry normal modulation","All those frequencies are unavailable to every terrestrial ground station"],"Satellite signals may be weak and depend on coordinated shared resources. Terrestrial use of satellite frequencies should not disrupt them."],
  ],
  "Logging": [
    ["7A6","Which time standard is normally used in amateur station logs to avoid local-time ambiguity?",["UTC","Only the operator’s daylight-saving time","Only the other station’s local time","The radio’s microphone-clock setting"],"UTC gives stations in different time zones a common reference, including when local daylight-saving rules differ."],
    ["7A6","Which is the most complete useful contact record from the following choices?",["Date, UTC time, frequency, mode, station worked and reports","Only the date, UTC time and maximum transmitter power","Only the date, local time and equipment serial number","Only the station worked and the antenna’s SWR"],"These details support contact records, QSLs and comparison with interference observations. An explicit Ofcom logging requirement must also be followed where imposed."],
  ],
  "Handling_Abuse": [
    ["7A7","An unknown station tries to provoke an argument. What is a suitable response?",["Avoid prolonging the exchange and follow appropriate operating/reporting advice","Keep responding until the other station stops","Increase power and transmit insults over them","Broadcast their details to the general public"],"A prolonged response can reward disruption. Disengage appropriately and use suitable advice or reporting channels for serious concerns."],
    ["7A7","Which content is unacceptable in ordinary amateur operation?",["Music and offensive or threatening transmissions","A normal station-identification call","An appropriate signal report","A request to change working frequency"],"The syllabus explicitly identifies music and offensive or threatening language as unacceptable. Normal identification and contact procedures are different."],
  ],
  "Operating_Overseas": [
    ["7H1","You take a UK Foundation handheld abroad. What should you assume about authority to transmit?",["Destination authorisation must be checked; the UK Foundation licence is not routinely recognised abroad","The UK call sign automatically authorises all overseas operation","A /P suffix supplies any missing permission","A low power setting always removes licensing requirements"],"Other administrations do not routinely recognise a UK Foundation licence. Check the destination’s requirements before transmitting."],
    ["7H1","Which item would establish whether your proposed overseas operation is allowed?",["The destination authority’s applicable recognition and authorisation conditions","Only the frequency range printed on the radio box","Only whether a local station can hear you","Only whether the antenna fits in your luggage"],"Equipment capability and a usable link do not establish permission. The destination’s applicable rules and recognition arrangements do."],
  ],
};

export const questions = Object.entries(byTopic).flatMap(([topic, rows]) => rows.map(([code, prompt, options, explanation, diagram = null, reference = false], index) => ({
  id: `${topic}:${index + 1}`, topic, code, section: code[0], prompt, options, correct: 0, explanation, diagram, reference,
})));
