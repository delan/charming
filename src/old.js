import "core-js/stable";
import "regenerator-runtime/runtime";

import { fetchAllData, getString, kDefinitionExists, isEmojiPresentation, isSpaceSeparator } from "./data";
import { pointToString, stringToPoint } from "./encoding";
import { toHexadecimal, pointToYouPlus, pointToString16, pointToString8, pointToEntity10 } from "./formatting";
import { pointToDiagonal, pointToSubstitute } from "./Display";

var	ucd_version = '14.0.0',
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
	var diagonal = pointToDiagonal(cp);

	if (diagonal != null) {
		return diagonal;
	}

	var substitute = pointToSubstitute(data, cp);

	if (substitute != null) {
		return substitute;
	}

	return pointToString(cp);
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
	throw new Error;
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

function like_emoji(cp) {
	return data ? isEmojiPresentation(data, cp) : false;
}

function like_space(cp) {
	return data ? isSpaceSeparator(data, cp) : false;
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
		if (!han && kDefinitionExists(data, i))
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
