import "core-js/stable";
import "regenerator-runtime/runtime";

import { fetchAllData, getString } from "./data";
import { pointToString, stringToPoint } from "./encoding";
import { toHexadecimal, pointToYouPlus, pointToString16, pointToString8, pointToEntity10 } from "./formatting";

var	ucd_version = '10.0.0',
	grid_elements = [],
	grid_base,
	current_cp,
	data_ready = false,
	data = null,
	data_defaults = {
		u16: cp => pointToString16(cp) || "(none)",
		u8: cp => pointToString8(cp) || "(none)",
		ent: cp => pointToEntity10(cp) || "(none)",
		name: '(unknown or unassigned)',
		block: '(unknown)',
		age: '(unknown)',
		gc: 'Unassigned (Cn)',
		mpy: '(not applicable)',
		bits: 0x00,
	};

function init_grid() {
	var row, cell, div;
	for (var i = 0; i < 256; i++) {
		if (i % 16 == 0) {
			row = $('<tr>');
			$('#grid').append(row);
		}
		cell = $('<td>');
		div = $('<div>');
		div.attr('id', 'g' + i);
		div.click(click_handler);
		cell.append(div);
		row.append(cell);
		grid_elements.push(div);
	}
}

function cp_display(cp) {
	if (is_C0(cp)) {
		return pointToString(cp + 0x2400);
	}
	if (cp == 0x007F) {
		return pointToString(0x2421);
	}
	if (cp == 0x2061) {
		return "f\u2061()";
	}
	if (cp == 0x2062) {
		return "13\u2062x";
	}
	if (cp == 0x2063) {
		return "Mᵢ\u2063ⱼ";
	}
	if (cp == 0x2064) {
		return "9\u2064¾";
	}
	if (cp == 0xE0020) {
		return "\u2420" + "ₜ";
	}
	if (cp >= 0xE0021 && cp < 0xE007F) {
		return pointToString(cp - 0xE0000) + "ₜ";
	}
	if (like_C1(cp)) {
		return cp_diagonal(cp);
	}
	if (like_space(cp)) {
		return "]" + pointToString(cp) + "[";
	}
	if (like_mark(cp)) {
		return "\u25CC" + pointToString(cp);
	}
	return pointToString(cp);
}

function cp_diagonal(cp) {
	if (cp >= 0xE0100)
		return "VS" + (cp - 0xE0100 + 17);
	if (cp >= 0xE007F)
		return "CT";
	if (cp >= 0xE0000)
		return "LT";
	if (cp >= 0xFFF9)
		return ["IAA", "IAS", "IAT", "OBJ"][cp - 0xFFF9];
	if (cp >= 0xFFA0)
		return ["HHF"][cp - 0xFFA0];
	if (cp >= 0xFEFF)
		return ["BOM"][cp - 0xFEFF];
	if (cp >= 0xFE00)
		return "VS" + (cp - 0xFE00 + 1);
	if (cp >= 0x3164)
		return ["HF"][cp - 0x3164];
	if (cp >= 0x2066)
		return ["LRI", "RLI", "FSI", "PDI", "ISS", "ASS", "IAFS", "AAFS", "NAT", "NOM"][cp - 0x2066];
	if (cp >= 0x2060)
		return ["WJ"][cp - 0x2060];
	if (cp >= 0x2028)
		return ["LS", "PS", "LRE", "RLE", "PDF", "LRO", "RLO"][cp - 0x2028];
	if (cp >= 0x200B)
		return ["ZWSP", "ZWNJ", "ZWJ", "LRM", "RLM"][cp - 0x200B];
	if (cp >= 0x180E)
		return ["MVS"][cp - 0x180E];
	if (cp >= 0x180B)
		return "FVS" + (cp - 0x180B + 1);
	if (cp == 0x061C)
		return "ALM";
	if (cp == 0x034F)
		return "CGJ";
	if (cp == 0x00AD)
		return "SHY";
	var w = [
		"PAD",
		"HOP",
		"BPH",
		"NBH",
		"IND",
		"NEL",
		"SSA",
		"ESA",
		"HTS",
		"HTJ",
		"VTS",
		"PLD",
		"PLU",
		"RI",
		"SS2",
		"SS3",
		"DCS",
		"PU1",
		"PU2",
		"STS",
		"CCH",
		"MW",
		"SPA",
		"EPA",
		"SOS",
		"SGCI",
		"SCI",
		"CSI",
		"ST",
		"OSC",
		"PM",
		"APC",
	];
	return w[cp - 0x80];
}

function update_grid() {
	grid_elements.forEach(function(e, i) {
		var cp = grid_base + i;
		e.text(cp_display(cp));
		e.removeClass("like_emoji");
		e.removeClass("like_C0");
		e.removeClass("like_C1");
		e.removeClass("like_space");
		if (like_emoji(cp))
			e.addClass("like_emoji");
		if (like_C0(cp))
			e.addClass("like_C0");
		if (like_C1(cp))
			e.addClass("like_C1");
		if (like_space(cp))
			e.addClass("like_space");
	});
}

function update_info() {
	var cp = current_cp;
	$('#cp').text(pointToYouPlus(cp));
	$('#big').val(cp_display(cp));
	$("#big, #goto_char").removeClass("like_emoji");
	$("#big, #goto_char").removeClass("like_C0");
	$("#big, #goto_char").removeClass("like_C1");
	$("#big, #goto_char").removeClass("like_space");
	if (like_emoji(cp))
		$("#big, #goto_char").addClass("like_emoji");
	if (like_C0(cp))
		$("#big, #goto_char").addClass("like_C0");
	if (like_C1(cp))
		$("#big, #goto_char").addClass("like_C1");
	if (like_space(cp))
		$("#big, #goto_char").addClass("like_space");
	if (!data_ready)
		return;
	document.title = pointToYouPlus(cp) + ' ' + get_data(cp, 'name');
	for (var x in data_defaults)
		$('#data_' + x).text(get_data(cp, x));
}

function set_hash(cp) {
	location.hash = toHexadecimal(cp);
}

function set_hash_text(text, field) {
	if (text.length == 0)
		return;
	else
		var cp = stringToPoint(text);
	if (field !== void 0) {
		$(field).val(cp_display(cp));
		yield_then_select(field);
	}
	set_hash(cp);
}

function yield_then_select(field) {
	if (!$(field).data("composing")) {
		setTimeout(function() {
			$(field).select();
		}, 0);
	}
}

function replace(cp) {
	location.replace("#" + toHexadecimal(cp));
}

function hashchange_handler() {
	var cp = parseInt(location.hash.slice(1), 16);
	if (isNaN(cp) || cp < 0 || cp > 0x10ffff)
		if (current_cp == undefined)
			return replace(0);
		else
			return replace(current_cp);
	if (location.hash.slice(1) != toHexadecimal(cp))
		return replace(cp);
	current_cp = cp;
	var new_grid_base = cp - cp % 256;
	if (new_grid_base != grid_base) {
		grid_base = new_grid_base;
		update_grid();
	}
	$('#goto_hex').val(toHexadecimal(cp));
	$('#goto_dec').val(cp);
	$('#goto_char').val(cp_display(cp));
	$('#grid td').removeClass('selected');
	grid_elements[cp % 256].parent().addClass('selected');
	update_info();
}

function click_handler() {
	var i = parseInt(this.id.substr(1));
	set_hash(grid_base + i);
}

function load_data() {
	$('#loading_noscript').hide();
	$('#loading_files').show();
	fetchAllData().then(result => {
		data = result;
		data_ready = true;
		$('#loading').hide();
		$('#ui').show();
		update_grid();
		update_info();
	});
}

function get_data(cp, prop) {
	if (!data || !(prop in data)) {
		var substitute = data_defaults[prop];
		if (typeof substitute == "function")
			return substitute(cp);
		return substitute;
	}
	if (
		prop == "name"
		|| prop == "gc"
		|| prop == "block"
		|| prop == "age"
		|| prop == "mpy"
	) {
		var result = getString(data, prop, cp);
		if (result != null) {
			return result;
		}

		var substitute = data_defaults[prop];
		if (typeof substitute == "function")
			return substitute(cp);
		return substitute;
	}
	if (prop == "bits")
		return data.bits.getUint8(cp);
	throw 13;
}

function get_clipboard(event) {
	if ("clipboardData" in event) {
		return event.clipboardData;
	}
	if ("originalEvent" in event) {
		return get_clipboard(event.originalEvent);
	}
	if ("clipboardData" in window) {
		return window.clipboardData;
	}
	return null;
}

function is_han(cp) {
	// gendata.py: kDefinition exists
	return !!(get_data(cp, "bits") & 0x01);
}

function is_emoji(cp) {
	// gendata.py: Emoji_Presentation
	return !!(get_data(cp, "bits") & 0x02);
}

function is_space(cp) {
	// gendata.py: General_Category Zs
	return !!(get_data(cp, "bits") & 0x04);
}

function is_mark(cp) {
	// gendata.py: General_Category M*
	return !!(get_data(cp, "bits") & 0x08);
}

function like_emoji(cp) {
	return is_emoji(cp);
}

function like_space(cp) {
	return is_space(cp);
}

function like_mark(cp) {
	if (is_mark(cp)) {
		switch (cp & 0xFFFFFFF0) {
		case 0x0300: // Combining Diacritical Marks
		case 0x0310:
		case 0x0320:
		case 0x0330:
		case 0x0340:
		case 0x0350:
		case 0x0360:
		case 0x0480: // Cyrillic
		case 0x1DC0: // Combining Diacritical Marks Supplement
		case 0x1DD0:
		case 0x1DE0:
		case 0x1DF0:
		case 0x20D0: // Combining Diacritical Marks for Symbols
		case 0x20E0:
		case 0x20F0:
		case 0x2CE0: // Coptic
		case 0x2CF0:
		case 0x2DE0: // Cyrillic Extended-A
		case 0x2DF0:
		case 0xA660: // Cyrillic Extended-B
		case 0xA670:
		case 0xA690:
		case 0xFE00: // Variation Selectors
		case 0xFE20: // Combining Half Marks
		case 0x101F0: // Phaistos Disc
		case 0x102E0: // Coptic Epact Numbers
		case 0x1D160: // Musical Symbols
		case 0x1D170:
		case 0x1D180:
		case 0x1D1A0:
		case 0x1D240: // Ancient Greek Musical Notation
		case 0xE0100: // Variation Selectors Supplement
		case 0xE0110:
		case 0xE0120:
		case 0xE0130:
		case 0xE0140:
		case 0xE0150:
		case 0xE0160:
		case 0xE0170:
		case 0xE0180:
		case 0xE0190:
		case 0xE01A0:
		case 0xE01B0:
		case 0xE01C0:
		case 0xE01D0:
		case 0xE01E0:
			return true;
		}
	}
	return false;
}

function is_C0(cp) {
	return cp < 0x0020;
}

function like_C0(cp) {
	return is_C0(cp)
		|| cp == 0x007F
		|| cp == 0x2061
		|| cp == 0x2062
		|| cp == 0x2063
		|| cp == 0x2064
		|| cp >= 0xE0020 && cp < 0xE007F;
}

function is_C1(cp) {
	return cp >= 0x0080 && cp < 0x00A0;
}

function like_C1(cp) {
	return is_C1(cp)
		|| cp == 0x00AD
		|| cp == 0x034F
		|| cp == 0x061C
		|| cp >= 0x180B && cp < 0x180F
		|| cp >= 0x200B && cp < 0x2010
		|| cp >= 0x2028 && cp < 0x202F
		|| cp >= 0x2060 && cp < 0x2061
		|| cp >= 0x2066 && cp < 0x2070
		|| cp >= 0x3164 && cp < 0x3165
		|| cp >= 0xFFA0 && cp < 0xFFA1
		|| cp >= 0xFFF9 && cp < 0xFFFD
		|| cp >= 0xFE00 && cp < 0xFE10
		|| cp >= 0xFEFF && cp < 0xFF00
		|| cp >= 0xE0001 && cp < 0xE0002
		|| cp >= 0xE007F && cp < 0xE0080
		|| cp >= 0xE0100 && cp < 0xE01F0;
}

init_grid();
hashchange_handler();
load_data();

$(window).on('hashchange', hashchange_handler);
$(window).keydown(function(e) {
	if (e.metaKey || e.shiftKey || e.ctrlKey || e.altKey)
		return;
	switch (e.keyCode) {
	case 33: // page up
		set_hash(current_cp - 256); break;
	case 34: // page down
		set_hash(current_cp + 256); break;
	case 35: // end
		if (current_cp == grid_base + 255)
			set_hash(0x10ffff);
		else
			set_hash(grid_base + 255);
		break;
	case 36: // home
		if (current_cp == grid_base)
			set_hash(0);
		else
			set_hash(grid_base);
		break;
	case 37: // left arrow
		set_hash(current_cp - 1); break;
	case 38: // up arrow
		set_hash(current_cp - 16); break;
	case 39: // right arrow
		set_hash(current_cp + 1); break;
	case 40: // down arrow
		set_hash(current_cp + 16); break;
	}
});
$('input').keydown(function(e) {
	e.stopPropagation();
});
$('#ui_tabs a').click(function(e) {
	$('#ui_content > div').hide();
	$('#' + this.id.substr(4)).show();
	$('#ui_tabs a').removeClass('selected');
	$(this).addClass('selected');
	e.preventDefault();
});
$('#ucd_version').text(ucd_version);
$('#search_form, #search_han').on('change keydown paste input submit', function(e) {
	var q = $('#search_query').val().toUpperCase();
	var sr = $('#search_results');
	if (!q.length)
		return;
	sr.empty();
	var han = $("#search_han").is(":checked");
	for (var n = 0, i = 0; n < 50 && i < 0x110000; i++) {
		if (!han && is_han(i))
			continue;
		var name = getString(data, "name", i);
		if (name == null)
			continue;
		if (name.toUpperCase().indexOf(q) > -1) {
			n++;
			sr.append($("<div>")
			.text(pointToYouPlus(i) + "\u2001" + name)
			.click(set_hash.bind(null, i)));
		}
	}
	e.preventDefault();
});
$('#goto_hex').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	set_hash(parseInt(this.value, 16));
});
$('#goto_dec').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	set_hash(parseInt(this.value, 10));
});

$("#big, #goto_char")
	.on("cut copy", function(event) {
		event.preventDefault();
		var text = pointToString(current_cp);
		get_clipboard(event).setData("text", text);
	})
	.on("paste", function(event) {
		event.preventDefault();
		var text = get_clipboard(event).getData("text");
		set_hash_text(text, this);
	})
	.on("compositionstart", function() {
		$(this).data("composing", true);
	})
	.on("compositionend", function() {
		$(this).data("composing", false);
		yield_then_select(this);
	})
	.on("input", function(event) {
		set_hash_text(this.value, this);
	})
	.on("focus", function(event) {
		$(this).select();
	});
