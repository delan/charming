var	ucd_version = '10.0.0',
	grid_elements = [],
	grid_base,
	current_cp,
	data_ready = false,
	data = null,
	data_defaults = {
		u16: function(cp) {
			return cp_char(cp).split('').map(function(x) {
				return ('0000' + hex(x.charCodeAt(0))).slice(-4);
			}).join(' ');
		},
		u8: function(cp) {
			return unescape(encodeURIComponent(cp_char(cp))).
				split('').map(function(x) {
					return ('00' + hex(x.charCodeAt(0))).slice(-2);
				}).join(' ');
		},
		ent: function(cp) {
			return '&#' + cp + ';';
		},
		name: '(unknown or unassigned)',
		block: '(unknown)',
		age: '(unknown)',
		gc: 'Unassigned (Cn)',
		mpy: '(not applicable)',
		bits: 0x00,
	};

function hex(cp) {
	return cp.toString(16).toUpperCase();
}

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

function cp_char(cp) {
	if (cp > 0xffff) {
		cp -= 0x10000;
		return String.fromCharCode(
			0xd800 + (cp >> 10),
			0xdc00 + (cp & 0x3ff)
		);
	} else {
		return String.fromCharCode(cp);
	}
}

function cp_string(cp) {
	var s = hex(cp);
	if (s.length < 5)
		s = ('000' + s).slice(-4);
	return 'U+' + s;
}

function update_grid() {
	grid_elements.forEach(function(e, i) {
		var cp = grid_base + i;
		e.text(cp_char(cp));
		e.removeClass("emoji");
		if (is_emoji(cp))
			e.addClass("emoji");
	});
}

function update_info() {
	var cp = current_cp;
	$('#cp').text(cp_string(cp));
	$('#big').val(cp_char(cp));
	$("#big, #goto_char").removeClass("emoji");
	if (is_emoji(cp))
		$("#big, #goto_char").addClass("emoji");
	if (!data_ready)
		return;
	document.title = cp_string(cp) + ' ' + get_data(cp, 'name');
	for (var x in data_defaults)
		$('#data_' + x).text(get_data(cp, x));
}

function set_hash(cp) {
	location.hash = hex(cp);
}

function replace(cp) {
	location.replace("#" + hex(cp));
}

function hashchange_handler() {
	var cp = parseInt(location.hash.slice(1), 16);
	if (isNaN(cp) || cp < 0 || cp > 0x10ffff)
		if (current_cp == undefined)
			return replace(0);
		else
			return replace(current_cp);
	if (location.hash.slice(1) != hex(cp))
		return replace(cp);
	current_cp = cp;
	var new_grid_base = cp - cp % 256;
	if (new_grid_base != grid_base) {
		grid_base = new_grid_base;
		update_grid();
	}
	$('#goto_hex').val(hex(cp));
	$('#goto_dec').val(cp);
	$('#goto_char').val(cp_char(cp));
	$('#grid div').removeClass('selected');
	grid_elements[cp % 256].addClass('selected');
	update_info();
}

function click_handler() {
	var i = parseInt(this.id.substr(1));
	set_hash(grid_base + i);
}

function load_data() {
	$('#loading_noscript').hide();
	$('#loading_files').show();
	var names = "string name gc block age mpy bits";
	data = {};
	load_next(names.split(" "));
}

function load_next(names) {
	var name = names.shift();
	var file = "data." + name + ".json.lzo.64";
	$("#loading_files").text("loading " + file);
	$.get(file, function(base64) {
		if (names.length)
			load_next(names);
		data[name] = JSON.parse(lzo1x.decompress(atob(base64)));
		if (!names.length) {
			data_ready = true;
			$('#loading').hide();
			$('#ui').show();
			update_grid();
			update_info();
		}
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
		var index = data[prop].charCodeAt(cp);
		if (index == 0xFFFF) {
			var substitute = data_defaults[prop];
			if (typeof substitute == "function")
				return substitute(cp);
			return substitute;
		}
		return data.string[index];
	}
	if (prop == "bits")
		return data.bits.charCodeAt(cp / 2 | 0)
			>> cp % 2 * 8 & 0xFF;
	throw 13;
}

function set_data(cp, prop, value) {
	if (!data[cp])
		data[cp] = {};
	data[cp][prop] = value;
}

function is_han(cp) {
	// gendata.py: kDefinition exists
	return !!(get_data(cp, "bits") & 0x01);
}

function is_emoji(cp) {
	// gendata.py: Emoji_Presentation
	return !!(get_data(cp, "bits") & 0x02);
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
	for (var n = 0, i = 0; n < 50 && i < data.name.length; i++) {
		if (!han && is_han(i))
			continue;
		var index = data.name.charCodeAt(i);
		if (!(index in data.string))
			continue;
		var name = data.string[index];
		if (name.toUpperCase().indexOf(q) > -1) {
			n++;
			sr.append($("<div>")
			.text(cp_string(i) + "\u2001" + name)
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
$('#big, #goto_char').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	else if (this.value.length == 1)
		set_hash(this.value.charCodeAt(0));
	else
		set_hash(
			0x10000 +
			((this.value.charCodeAt(0) - 0xd800) << 10) +
			(this.value.charCodeAt(1) - 0xdc00)
		);
});
$('#big, #goto_char').on('change keydown paste input focus click', function() {
	// select entire box, even when there is only an invisible character
	// this prevents confusion when inputing in a seemingly empty box fails
	$(this).select();
});
