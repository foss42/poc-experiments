import 'package:flutter/material.dart';

// ---------------------------------------------------------------------------
// Spacing helpers
// (mirrors the subset of apidash_design_system used by the Open Responses
// widgets so the demo runs without pulling in the full apidash monorepo)
// ---------------------------------------------------------------------------

const kHSpacer4 = SizedBox(width: 4);
const kHSpacer8 = SizedBox(width: 8);
const kHSpacer16 = SizedBox(width: 16);

const kVSpacer5 = SizedBox(height: 5);
const kVSpacer8 = SizedBox(height: 8);
const kVSpacer10 = SizedBox(height: 10);
const kVSpacer12 = SizedBox(height: 12);
const kVSpacer16 = SizedBox(height: 16);

const kP8 = EdgeInsets.all(8);
const kP10 = EdgeInsets.all(10);

const kBorderRadius8 = BorderRadius.all(Radius.circular(8));

// ---------------------------------------------------------------------------
// Code style — monospace font used for JSON / code blocks
// ---------------------------------------------------------------------------

const kCodeStyle = TextStyle(fontFamily: 'monospace');
