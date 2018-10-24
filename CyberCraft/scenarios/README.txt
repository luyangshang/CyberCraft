					File structure
The folder contain the following files (most of the files are bind to a particular scenario. Therefore, the scenario number in the filename will be represented as an X here):

README.txt: The file you are reading is a text file describing the content of this folder.

map_hall.json: a json file made with Tiled to illustrate the 2D map of the hall.

personalNotes.json: this file stores the entries related to the personal notes. Most importantly, the acts and buffs activated in the game will have a link to the corresponding entry in the personal notes, where the security terms will be more deeply discussed. It's strongly suggested that, whenever a new act or a new buff is added to a scenario, an entry of it to be added to personal notes also.

credits.txt: what will be shown at the credits phase.

assetsTable.json: an table for all the images, spritesheets and audio(sound and music), to be loaded at load phase, which covers nearly all the assets of the game. images contains the path of the image and the key assigned to it. spritesheets need also the specification of frameWidth and frameHeight. audios allows the urls to take the value of a single string or an array of strings, but in this game, no urls is given as array of strings.

common_acts.json: the common acts file defines the acts and buffs used by cyberspace phasethat is frequently shared across scenarios. However, for a certain scenario, not all of the acts or buffs are used. Also, the scenario can define its own acts or buffs in addition to those defined here. The scenario can even redefine some acts or buffs. All these settings for the scenario are done by the files called scenarioX_cyber.json

scenarioX_cyber.json: The cyber file specifies the data used in the cyberspace phase for scenario X exclusively. Examples of the data include the player's role in the fight, the defender's assets, as well as the acts and buffs used in the cyberspace. Note that, this file takes some acts or buffs from common_acts.json, but it also define its own acts or buffs.

scenarioX_intro.txt: (optional for each scenario) the intro file illustrates what will be shown at the introduction phase of a scenario. It involves text as well as pictures. With it the players are supposed to see a short introduction of the story of this scenario before the game formally starts(e.g. a short briefing of time, place, characters).

scenarioX_NPCs.json: the NPC file stores for the scenario the information of the NPCs that will be found in the hall. Most important of all, it contains the dialogues of the NPCs, as well as how the NPCs change their dialogues (states) with the player's interaction with them. The hall is supposed to be a place where the player can freely gather information realted to the incoming fight. The NPCs are to give hints and recommendations for the player.

scenarioX_outro.txt: (optional for each scenario) the outro file is similar to the intro file, only that it's put at the end of the level, showing the result of the what the player has done in the game. It also support texts and pictures.

tutorial2_cyber.json and tutorial3_cyber.json: the cyber file for the two tutorials teaching things about cyberspace. Tutorial2_cyber teaches how to play as defender, and tutorial3_cyber teaches how to play as intruder.

tutorialX_intro.txt: the tutorial equivalence of introduction file.

tutorial1_NPCs.json: the NPC file for tutorial 1 esclusively. Only this tutorial focuses on hall phase, so only tutorial 1 has NPC file.

tutorialX_outro.txt: the outro file for the three tutorials.

Therefore, to add a new scenario, one need to add one cyber file and one NPC file, and optionally an intro file and one outro file. The scenario number is not in any way bound to the content of the scenario. So that you can renumber them as you want, even adding scenarios in between old ones. However, the scenario numbers have to be consecutive, otherwise, the loader will stop at the first missing scenario. It's also recommended to add entries in personalNotes.json for new acts and buffs you have created.



					File format details

1. personalNotes.json: the note have a first entry named "Personal notes", which tells something in general about the note itself. The root element "desc" here is just that "something about itself".
"acts" contains "offDesc" and "defDesc", which are the descriptions of offensive and defensive acts respectively. "offDesc" and "defDesc" are followed by "offensive" and "defensive", which defines the entries of offensive acts or of defensive acts. Similarly, parrallel to "acts", there is also "buffs" with "buffDesc", and under the other "buffs" element of it, the entries for the buffs are defined.
The definition for offensive acts, defensive acts or buffs follows this format:
	name: A name of the security term (the entry). Acts and buffs of exactly the same name will obtain a link directly to this entry.

	desc: The description of it. The description can contain multiple pages, delimited by character "^". Each page can be either a pure text page or an image-text-mixed page. The pattern is quite similar to that of the intro file described below, except that the pure text here will be displayed without typing animation. 

	sees: (optional)An array of links to other entries in the personal notes. It's recommended to try to add some links to related security terms, so that a knowledge graph is built.

	url1 and url2: (optional)Links to external websites where the security term is further explained. The link to external resources in addition to the personal notes itself, serves as a more professional resource for the players with more motivation and more curiosity.

It's recommended to create an entry for each new acts or buffs defined in scenarioX_cyber.json (with exactly the same name), so that the players can always have a place to refer to when they get confused with the term.

2. scenarioX_intro.txt/scenarioX_outro.txt/tutorialX_intro.txt/tutorialX_outro.txt/credits.txt: these files follow the same pattern: It involves pages of pure text or image-text-mixed pages. The pure text page will be displayed with typing animation, while the image-text-mixed page will be displayed immediately. The pages will be delimited by a character "^". 

A pure text page contain only pure text of course. Note that the character "^" is reserved character, which is not supposed to be anywhere inside the page. Character "#" is also not supposed to be placed at the start of the pure text page.

A image-text-mixed page is characterized by a character "#" at the start of the page. As a matter of fact, this kind of page is composed of images and texts, each described after a "#" character. Here, newline as \r \n or \r\n will be ignored by the program.

To create a image, follow this pattern:
#image$<x coordinate>$<y coordinate>$<path to the image file>
To create a text in the image-text-mixed page, follow this pattern:
#text$<x coordinate>$<y coordinate>$<text to create>
The text can also have one more argument:
#text$<x coordinate>$<y coordinate>\$<text to create>\$<word wrap width>

Note here that, all those within angular brackets should be replaced with actual values. Also, if the readers know about Phaser, they will realize that the arguments in this pattern are just align with the arguments to define image sprite and text sprite.

3. scenarioX_NPCs.json:
The file contains an array called NPCs, whose elements are description of each NPC in the scenario.

	name: the name of the NPC. One can also add the title and the profession can.
	sprite: the path to the picture of the sprite of the NPC
	portrait: the path to the picture of the portrait of the NPC
	x: the x coordinate to put the NPC sprite in the game
	y: the y coordinate to put the NPC sprite in the game
	speeches: the array of the NPC's speeches. A speech is a chain of sentences (potentially multi page) that the NPC will say without stoping.	Though not specified here, when the game runs each NPC will have a state. e.g. at state 0, when talked to, the NPC will use the first piece of speech; at state 1, the second piece of speech

Each piece of speech contains prerequists (optinal) and speech. speech is of course what the NPC will say at the particular state. Long speech need to be devided into multiple pages. The character "^" will be used to separate pages.

prerequists is the condition on other NPCs' states that need to be firstly meet, before this NPC will come to this state. This functionality is useful to build a experience of discovery in the hall phase. e.g. NPC1 asks the player to collect information by asking NPC2. NPC1 will repeat the same sentence if the player just keep clicking on NPC1. When the player has talked to NPC2, having found the information, setting NPC2's state to the appropriate value, NPC1 will change to the next state to congratulate the player for the finding.	To see a really definition, if the prerequisits is the following:
	"prerequisits": 
	[
		{"npc": "npc2",
		"state": 2},
		{"npc": "npc3",
		"state": 3}
	]
	That means npc3 has to reach state 2 (the third speech defined in speeches), and npc3 has to reach state 3, before this npc will come to this particular state.
	There is one special speech (state), that is the speech asking if the player is done with the talk in the hall, and is ready to go into the cyberspace to challenge the opponent. This particular speech is necessary for every scenario (in order to process from hall phase), and it's indicated by a "`" character at the first page of a speech. When an NPC when talked to, reaches this speech, a question like "Are you ready for the cyber battle?", together with "Yes" button and "No" button will be shown. The real question can be configured by writing a single page text after the "`" character. Extra pages of text after the "`" character will be ignored by the program. N.B. don't add more speeches (states) after this final question. If you do so, if the player wanted to hall around a little longer, and clicked on the "No" button, the NPC will never ask the question again, trapping the player forever in the hall.
Final point: the first NPC will come to talk to the player when the player enters the hall, even if the player has not clicked on anyone. It's quite reasonable for this NPC to be the manager or the dest clerk of this place

4. common_acts.json:
acts: it consists of two arrays. The first array define acts for the intruder, and the second array define acts for the defender.
	name: (required)the name of the act
	prerequists: an array of acts that need to be unlocked beforeunlocking this act
	learningCost: the cost to unlock this act
	desc: short, single page description. It's shown in non-scrollable popup window, so don't make it long. To put long explanation, use personal notes
	needSelfBuffs: the player has to have this buff in order to perform the act
	needRivalBuffs: the rival has to have these buffs for the player to perform the act successfully
	noSelfBuffs: the player should not have these buffs in order to perform the act
	noRivalBuffs: the rival should not have these buffs for the player to perform the act successfully
	cost: (required) the cost of performing this act. Zero-cost act cannot be performed. It will be used as prerequist for other acts.
	successRate: the initial success rate of the act. It can be modified in game by other acts. By default, it takes 1.	
	selfBuffs: the buff enforced to the player when the act succeeds
	rivalBuffs: the buff enforced to the rival when the act succeeds
	cleanSelfBuffs: the buff cleaned on the player when the act succeeds
	cleanRivalBuffs: the buff cleaned on the rival when the act succeeds
	buffLength: for how many rounds the buff will remain on the player/rival. Setting buffLength as -1 means the buff is has infinite length; 0 is erroneous; 1 means the buff expires at the end of your round; 2 at the end of rival's round. For majority of the cases, a positive even number is expected. Default to -1.
	bonus: the bounty for the intruder when the act succeeds. It's also the damage to the assets of the defender
	spamRequests: the spamRequests generated from the buffs of this act (it's normally supposed to be an offensive act enforcing one single buff to the defender). Default to 0.
	modifier: a string which modifies some properties of other acts.
		modifier format: The string can contain multiple modifications, each delimitered by the semicolon(";"). For each modification, it contain five parts delimitered by colon(":")
		<role>:<act name>:<property>:<operant>:<amount>
		role==0 means it modifies for the offensive acts, while role ==1 means it modifies for the defensive acts. property takes values like successRate or spamRequests. operant takes one of the five values: "+", "-", "*", "/", "=". They represent assignment operation "+=", "-=", "*=", "/=", "=" respectively.
	learnt: if the act is initially learnt at the start of the game. Default false.
	unlocked: if the act is already unlocked at the start of the game. Default to true. Acts Initially locked is supposed to be unlocked by scripts.	

buffs: buffs: it's an array of buff definitions. The definition contains the following values:
\begin{enumerate}
	name: (required)the name of the buff. It's possible to use the same name as the act which enforces the buff.
	desc: (required)the buff description. It's also a single-page short description within a non-scrollable popup window, so don't make it long. To put long explaination, use personal notes.
	capacity: the extra server capacity provided by this buff. Default to 0.
	upkeep: the amount of resource lost each defender's round, due to the presence of the buff. Default to 0.
	dosResistance: the resistance to DoS attacks provided by each buffs. Default to 0.
	
scenarioX_cyber.json and tutorialX_cyber.json:
	name: the name of the scenario
	serverCapacity: the initial server capacity of server  to serve incomming requests
	serverAccessValley: the minimum amount of requests to the server each defender's round
	serverAccessPeak: the maximum amount of requests to the server each defender's round
	initialResource: how much resource the intruder and the defender have (before round 1)
	constantIncome: the resource obtained each time the character starts his round. This guarantees a minimum income. However, it's more suitable to let the defender gain resource from responding to the clients requests rather than from this.
	maxResource: the players can't keep more resource than this value.
	maxRounds: the number of rounds of this scenario. If the defender can sustain until this time, the defender wins.
	assets: the initial "HP" of the defender. The defender will be penalized on assets at each credential breach. If the assets droped to zero or less than zero before the maxRounds reaches, the intruder wins.
	defensive: if true, the player plays as the intruder; if false, the player plays as the defender. The AI written in the latter part of this file should be consistent with the value here: the AI plays the opposite role.
	characterName: the name to be displayed as the name of the intruder and the defender
	portrait: key value of the portrait pictures of the intruder and the defender
	common acts/buffs: the name of the acts/buffs activated in this scenario, which is defined in common_acts.json. If this scenario will modify some parameters of an act/buff, the act/buff should not be listed here.
	acts/buffs: the new definition and redefinition of acts/buffs for this scenario, compared to those in common_acts.json. For detailed format of definition, refer to common_acts.json above.
	initialBuffs: describes the buffs that the intruder or the defender already have at the start of the game. name: the name of the buff. length: for how many rounds the buff will last. length == -1 means the buff will be there from the start till the end; length > 0 means the buff will be there for the first rounds; length == 0 is erroneous.
	AI: an array of action patterns that AI will follow.
		pattern: an array of acts characterizes this action pattern. When the pattern is chosen, AI will firstly guarantee the acts are all learnt (could take multiple rounds). Then, if the resource is enough, AI will apply this acts in sequence in one round. If the resource is insufficient for all the acts, AI will wait, until the necessary resource is obtained. The acts in the pattern are usually supposed to be a combo.
		chance: the chance that AI will choose this pattern out of all others. Note that if any of the acts in the pattern is not unlocked yet, the pattern is considered lock, and AI will ignore the pattern. 
	The sum of the percentages of all the action pattern can exceed 1. This is because for each turn, AI will only consider the unlocked patterns. The sum of unlocked action patterns can also exceeds 1. In this case, the patterns will consumes the chances in sequence, meaning that the last patterns may suffer their chance decreased. This is understandable and even useful, in the sense that one can make use of this effect to reduce AI's likely hood to perform some acts that are designed for the earlier stages.
	scripts: It's an array of scripts, each following this format:
		round: the script will be activated at the start of this round
		dialogues: the dialogues to display:
			name: the name to be displayed for the speacker of the dialogue
			portrait: the portrait of the speacker
			dialogue: the (multi-page)dialogue to display. Use "\^{}" to delimit pages.
		newActs: arrays of acts to be unlocked. First array for the intruder, and second array for the defender
		shouldApply: (should be specified only for player¡¯s rounds) it¡¯s an array of act names. It enforces the player to apply the those acts in the designated round. If
the player has not applied all the acts in the round, the ¡±End turn¡± button will be
locked. This functionality is useful for the tutorial section, to force the player try
out newly taught acts. Nevertheless, this functionality reduces player¡¯s freedom,
so it¡¯s deprecated for the formal scenarios. Also be aware, when adding this con-
straint, one should guarantee those acts are already unlocked, and the resources
are adequate. Otherwise, the player will fall into a deadlock.

About numbering of scenarios: one can create as many new scenarios as he/she want. If new scenario is to be put after the old ones, just number them increasingly. To add scenarios in the middle, however, one have to renumber those old scenarios, leaving a gap for the new one. In either case, remember that the program will stop searching for more scenarios at the first absent number, so, do number them continuously.


					Error messages

If you modify the files in the scenario folder, you may encounter some error messages related to the inconsistence or wrong format. Here are some of the erros messages:

*Cannot find scenarios/assetsTable.json or the file is corrupted! 
Maybe assertsTable.json is mission, maybe the file does not conform with JSON format. One common mistake is missing or having too much commas in an array.

*Error! The act " XXX" activated for this scenario (scenario Y) is not defined in common_acts.json!"
In scenarioY_cyber.json, under the element of "commonActs", you have written XXX. This means the scenario will take suh an act definition in common_acts.json. However, it's not found. Maybe it's because of wrong spelling (the name is case sensitive and should match exactly). Maybe you have got a wrong role: intruder's acts are always in the first array, while defender's acts always in the second array.

*Error! The prerequist "ZZZ" of act "YYY" activated for this scenario (scenario Z) is wrong!
In the definition of act called YYY from scenarioZ_cyber.json, the property of prerequists is specified. However, at least one of the prerequists (should be an act name) is not an act defined for this scenario.

*Error! An act name is missing Recheck scenarioX_cyber.json
In the definition of an act, the name is compulsory

*Error! The act "YYY" is missing cost Recheck scenarioX_cyber.json or common_acts.json
In the definition of an act, the cost is compulsory. No act should cost zero resource. Zero-cost act on the other hand means the act cannot be used. Then the act is only put in the game as a prerequist for other acts.

*Error! The buff "XXX" related to an act in scenario Y is not found!
This scenario will enforce/clean buff on the character. Whereas, the definition of the buff is not found.

*modifier format wrong
It's not suggested to use modifier if you have other alternatives. But if you do want to use it, the  modifier should be written as a string, delimited by semicolon(;) into substrings, each following this regular expression:
/^[01]:[^:]*:[^:]*:["+""-""*""/""="]:[0-9]+\.?[0-9]*$/
For detailed description, see "File format details" above.

*Error! The act "XXX" specified in the AI pattern for this scenario (scenario Y) is not defined!
Under the element pattern of AI, you have given a name that is not seen as an act name.

*Warning! The buff "XXX" activated for this scenariol (scenario Y) misses description
A buff called XXX is not defined. The program assumes the buff has empty description and no other properties (capacity, upkeep, dosResistance). But it's still recommended that you define the buff or import it from generic_acts.json.

*Sorry. This entry is not found in personal notes!
It's recommended that when you add new acts or buffs to the game, you add entries to the personal notes also. In this way, the player will have a in-game help about the new security term. Also, personal notes serves as an in-game source of knowledge for those interested to learn.

*Error! in the scenario file scenarioX_NPCs.json, in the prerequists of the speeches, a reference to a npc name is not found!
The dependency of dialogues is based on the name of the NPC. Probably you have changed the name of the NPC, but have not changed the references to it. Remember that it's case sensitive.

*Warning! The script for round X is not understandable.
The script will run at the start of round X. X have to be a positive number of course.

*The game just stop at loading or during the game
It's quite possible that there are other runtime errors that can be viewed only by checking the console. The way to open console could be different from browser to browser, but the console is usually one part of Developer tools (opened with F12). For messages at console, see below.


There are also some other console messages that can be seen only by opening developer tools.

*GET http://localhost/CyberCraft/scenarios/scenarioX_cyber.json 404 (Not Found)
This message always comes. The game knows about the number of scenarios at the first cyber file not found. Therefore, there is no problem here.

*scenarioX_intro.txt not defined/scenarioX_outro.txt not defined
You have created a scenarioX_cyber.json, which indicates a new scenario is added. However, the intro or outro file for the scenario is not created with it. There is no problem if you don't have intro or outro files. The game will just skip them.

*scenarioX_NPCs.json not defined
The NPC file is always needed. The absence of NPC file will result in an error sooner or later. If you don't know what to be written in the NPC file, just put a single person, with the only dialogue leading to the cyberspace (a single page dialogue starting with the character " ` ").

*(warning) error loading asset from URL assets/XXX/XXX.png
You have added new reference to assets in assetsTable.json. However, the path is wrong.

*Uncaught SyntaxError: Unexpected token , in JSON at position XXX
One of the JSON files have syntax error. It could be the newly added JSON file. A debugger may offer you a link directly to the place of the error.
