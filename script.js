var	ucd_version = '10.0.0',
	grid_elements = [],
	grid_base,
	current_cp,
	data_ready = false,
	data = null,
	data_defaults = {
		u16: function(cp) {
			return cp_char(cp).split('').map(function(x) {
				return ('0000' + x.charCodeAt(0).toString(16).
					toUpperCase()).slice(-4);
			}).join(' ');
		},
		u8: function(cp) {
			return unescape(encodeURIComponent(cp_char(cp))).
				split('').map(function(x) {
					return ('00' + x.charCodeAt(0).
						toString(16).toUpperCase()).
						slice(-2);
				}).join(' ');
		},
		ent: function(cp) {
			return '&#' + cp + ';';
		},
		name: '(unknown or unassigned)',
		block: '(unknown)',
		age: '(unknown)',
		gc: 'Unassigned (Cn)',
		mpy: '(not applicable)'
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
	var s = cp.toString(16).toUpperCase();
	if (s.length < 5)
		s = ('000' + s).slice(-4);
	return 'U+' + s;
}

function update_grid() {
	grid_elements.forEach(function(e, i) {
		var cp = grid_base + i;
		e.text(cp_char(cp));
	});
}

function update_info() {
	var cp = current_cp;
	$('#cp').text(cp_string(cp));
	$('#big').text(cp_char(cp));
	if (!data_ready)
		return;
	document.title = cp_string(cp) + ' ' + get_data(cp, 'name');
	for (var x in data_defaults)
		$('#data_' + x).text(get_data(cp, x));
}

function set_hash(cp) {
	location.hash = cp.toString(16);
}

function hashchange_handler() {
	var cp = parseInt(location.hash.substr(1), 16);
	if (isNaN(cp) || cp < 0 || cp > 0x10ffff)
		if (current_cp == undefined)
			return set_hash(0);
		else if (!location.hash.length)
			return;
		else
			return set_hash(current_cp);
	current_cp = cp;
	var new_grid_base = cp - cp % 256;
	if (new_grid_base != grid_base) {
		grid_base = new_grid_base;
		update_grid();
	}
	$('#goto_hex').val(cp.toString(16));
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
	$.get('data.json.lzo.64', function(base64) {
		var lzo = atob(base64);
		var json = lzo1x.decompress(lzo);
		data = JSON.parse(json);
		data.forEach(function(o, i) {
			o.cp = i;
		});
		data_ready = true;
		$('#loading').hide();
		$('#ui').show();
		update_info();
	});
}

function get_data(cp, prop) {
	if (!data[cp] || !data[cp][prop]) {
		var def = data_defaults[prop];
		if (def instanceof Function)
			return def(cp);
		else
			return def;
	}
	return data[cp][prop];
}

function set_data(cp, prop, value) {
	if (!data[cp])
		data[cp] = {};
	data[cp][prop] = value;
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
$('#search_form, #search_han').on('submit change', function(e) {
	var q = $('#search_query').val();
	var sr = $('#search_results');
	if (!q.length)
		return;
	sr.empty();
	data.filter(function(o) {
		return (o.name || '').toLowerCase().indexOf(
			q.toLowerCase()) != -1;
	}).filter(function(o) {
		if (!$('#search_han').is(':checked') && o.han)
			return false;
		return true;
	}).slice(0, 50).forEach(function(o) {
		sr.append(
			$('<div>').
			text(cp_string(o.cp) + '\u2001' + o.name).
			click(function() {
				set_hash(o.cp);
			})
		);
	});
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
$('#goto_char').on('change keydown paste input', function() {
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
$('#goto_char').on('focus click', function() {
	// select entire box, even when there is only an invisible character
	// this prevents confusion when inputing in a seemingly empty box fails
	$(this).select();
});
